import { cookies } from "next/headers";

import { getDb } from "@/db";
import { BATTEMENT_SSE, ENTETES_SSE, creerCompteurFlux, evenementSse } from "@/lib/flux-sse";
import { avancerSalle, lireEtatSalle, reponseErreurSalle } from "@/lib/salles";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import { salleParamsSchema } from "@/lib/validation";
import { valider } from "@/lib/validation-http";

// Temps réel de la salle (SCRUM-84) : Server-Sent Events. Le serveur pousse l'état (joueurs, scores,
// question ouverte) dès qu'il change ; le navigateur ne fait que l'écouter, les réponses restent
// des POST. L'état est relu en base chaque seconde : simple, sans bus de messages, et juste même
// si plusieurs instances servaient l'application. Voir docs/temps-reel.md.
const INTERVALLE_MS = 1_000;
const BATTEMENT_MS = 15_000;
// Une salle dure une dizaine de minutes ; au-delà, EventSource se reconnecte seul.
const DUREE_MAX_MS = 30 * 60_000;
// Le navigateur se reconnecte après 3 s si la connexion tombe (redéploiement, réseau mobile).
const RECONNEXION_MS = 3_000;

const compteur = creerCompteurFlux({ maxParCle: 3, maxTotal: 300 });

export async function GET(requete: Request, ctx: RouteContext<"/api/salles/[code]/flux">) {
  const params = valider(salleParamsSchema, await ctx.params);
  if (!params.ok) return params.reponse;

  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const jetonHash = jeton ? hasherJeton(jeton) : null;
  const demande = { code: params.donnees.code, jetonHash };
  const db = getDb();

  // Vérifié avant d'ouvrir le flux : un non-membre reçoit une erreur HTTP, et EventSource s'arrête.
  const premier = await lireEtatSalle(db, demande);
  if (premier.statut !== "ok") return reponseErreurSalle(premier);

  const cle = jetonHash ?? "";
  if (!compteur.acquerir(cle)) {
    return Response.json(
      { erreur: "trop_de_flux" },
      { status: 429, headers: { "Retry-After": "10" } },
    );
  }

  const encodeur = new TextEncoder();
  const { id_salle } = premier;
  let ferme = false;

  const flux = new ReadableStream<Uint8Array>({
    async start(controleur) {
      const fermer = () => {
        if (ferme) return;
        ferme = true;
        compteur.liberer(cle);
        try {
          controleur.close();
        } catch {
          // Déjà fermé par le client.
        }
      };
      requete.signal.addEventListener("abort", fermer);
      const envoyer = (texte: string) => {
        if (!ferme) controleur.enqueue(encodeur.encode(texte));
      };

      envoyer(`retry: ${RECONNEXION_MS}\n\n`);
      let etat = premier.etat;
      let dernier = JSON.stringify(etat);
      envoyer(evenementSse(etat));

      const debut = Date.now();
      let dernierEnvoi = Date.now();
      try {
        while (!ferme && etat.statut !== "terminee" && Date.now() - debut < DUREE_MAX_MS) {
          await new Promise((fin) => setTimeout(fin, INTERVALLE_MS));
          if (ferme) break;
          if (etat.statut === "en_cours") await avancerSalle(db, id_salle);
          const relu = await lireEtatSalle(db, demande);
          if (relu.statut !== "ok") break;
          etat = relu.etat;
          const texte = JSON.stringify(etat);
          if (texte !== dernier) {
            dernier = texte;
            envoyer(evenementSse(etat));
            dernierEnvoi = Date.now();
          } else if (Date.now() - dernierEnvoi >= BATTEMENT_MS) {
            envoyer(BATTEMENT_SSE);
            dernierEnvoi = Date.now();
          }
        }
      } catch {
        // Base indisponible : on ferme, EventSource se reconnectera.
      } finally {
        fermer();
      }
    },
    cancel() {
      if (!ferme) {
        ferme = true;
        compteur.liberer(cle);
      }
    },
  });

  return new Response(flux, { headers: ENTETES_SSE });
}
