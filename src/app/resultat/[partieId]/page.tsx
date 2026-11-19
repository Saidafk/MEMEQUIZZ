import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BoutonLien } from "@/components/BoutonLien";
import carte from "@/components/Carte.module.css";
import { Feuille } from "@/components/Feuille";
import { getDb } from "@/db";
import { lireResultat } from "@/lib/parties";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import { identifiantUrlSchema } from "@/lib/validation";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Résultat — MEMEQUIZZ",
  robots: { index: false },
};

const formatPoints = new Intl.NumberFormat("fr-FR");

// Le résultat est lu en base d'après `partieId` et le cookie de session : seul le joueur voit sa
// partie. `params` et `cookies()` sont des données de requête : lues sous <Suspense> (Cache Components).
async function Resultat({ params }: PageProps<"/resultat/[partieId]">) {
  const id = identifiantUrlSchema.safeParse((await params).partieId);
  if (!id.success) notFound();

  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const lecture = await lireResultat(getDb(), {
    id_partie: id.data,
    jetonHash: jeton ? hasherJeton(jeton) : null,
  });
  if (lecture.statut !== "ok") notFound();

  const r = lecture.resultat;
  // Partie pas finie : on y retourne plutôt que d'afficher un résultat partiel.
  if (r.statut !== "terminee") redirect(`/jeu/${id.data}`);

  return (
    <div className={carte.colonnes}>
      <div className={styles.page}>
        <h1 className={styles.titre}>Partie terminée !</h1>

        <section className={styles.score} aria-label="Score final">
          <p>Score final</p>
          <p className={styles.points}>
            <span className={styles.surligne}>{formatPoints.format(r.score)} pts</span>
          </p>
        </section>

        <div className={styles.cartes}>
          <p className={styles.carte}>
            <span className={styles.gros}>
              {r.bonnes} / {r.total}
            </span>
            bonnes réponses
          </p>
          {/* Pas de rang général pour une partie jouée en salle : elle n'est pas classée. */}
          {r.rang !== null && (
            <p className={styles.carte}>
              <span className={styles.gros}>{r.rang}e</span>
              sur {r.nombre_joueurs} {(r.nombre_joueurs ?? 0) > 1 ? "joueurs" : "joueur"}
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <BoutonLien href="/">Rejouer ↻</BoutonLien>
          <BoutonLien href="/classement" variante="contour">
            Voir le classement
          </BoutonLien>
          <BoutonLien href="/salle" variante="contour">
            Défier des amis en salle →
          </BoutonLien>
        </div>
      </div>

      <section className={carte.carte} aria-labelledby="titre-recap">
        <h2 id="titre-recap" className={styles.sousTitre}>
          Tes {r.total} réponses
        </h2>
        <ol className={styles.recap}>
          {r.details.map((d, i) => (
            <li key={i} value={i + 1} className={styles.reponse}>
              <span className={styles.rang}>{i + 1}.</span>
              <span aria-hidden="true" className={d.juste ? styles.juste : styles.fausse}>
                {d.juste ? "✓" : "✗"}
              </span>
              <span className={styles.nom}>
                {d.nom}
                <span className="masque-visuel"> : {d.juste ? "bonne" : "mauvaise"} réponse</span>
              </span>
              <span>{d.points > 0 ? `+${formatPoints.format(d.points)}` : "0"} pts</span>
            </li>
          ))}
        </ol>
        <p className={styles.legende}>✓ bonne · ✗ mauvaise</p>
      </section>
    </div>
  );
}

export default function PageResultat(props: PageProps<"/resultat/[partieId]">) {
  return (
    <Feuille largeur="large" retour={{ href: "/", libelle: "Accueil" }}>
      <Suspense fallback={<p role="status">Chargement du résultat…</p>}>
        <Resultat {...props} />
      </Suspense>
    </Feuille>
  );
}
