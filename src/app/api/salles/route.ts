import { getDb } from "@/db";
import { creerSalle, reponseErreurSalle } from "@/lib/salles";
import { cookieSession, genererJeton, hasherJeton } from "@/lib/session";
import { pseudoSalleSchema } from "@/lib/validation";
import { validerCorpsJson } from "@/lib/validation-http";

// Crée une salle (SCRUM-83) : l'hôte reçoit, comme en solo, un joueur anonyme, sa partie et le
// cookie de session. Le code renvoyé est à partager aux autres joueurs.
export async function POST(requete: Request) {
  const corps = await validerCorpsJson(requete, pseudoSalleSchema);
  if (!corps.ok) return corps.reponse;

  const jeton = genererJeton();
  const resultat = await creerSalle(getDb(), {
    pseudo: corps.donnees.pseudo,
    jetonHash: hasherJeton(jeton),
  });
  if (resultat.statut !== "ok") return reponseErreurSalle(resultat);

  return Response.json(
    { code: resultat.code, id_partie: resultat.id_partie },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": cookieSession(jeton, process.env.NODE_ENV === "production"),
      },
    },
  );
}
