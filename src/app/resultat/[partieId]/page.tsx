import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Bonhomme } from "@/components/Bonhomme";
import { BoutonLien } from "@/components/BoutonLien";
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
        <p className={styles.carte}>
          <span className={styles.gros}>{r.rang}e</span>
          sur {r.nombre_joueurs} {(r.nombre_joueurs ?? 0) > 1 ? "joueurs" : "joueur"}
        </p>
      </div>

      <section className={styles.recap} aria-labelledby="titre-recap">
        <h2 id="titre-recap" className={styles.sousTitre}>
          Tes {r.total} réponses
        </h2>
        <ol className={styles.pastilles}>
          {r.reponses.map((juste, i) => (
            <li
              key={i}
              className={`${styles.pastille} ${juste ? styles.juste : styles.fausse}`}
              value={i + 1}
            >
              <span aria-hidden="true">{juste ? "✓" : "✗"}</span>
              <span className="masque-visuel">
                Question {i + 1} : {juste ? "bonne" : "mauvaise"} réponse
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.legende}>✓ bonne · ✗ mauvaise</p>
      </section>

      <div className={styles.dessin}>
        <Bonhomme largeur={200} />
      </div>

      <div className={styles.actions}>
        <BoutonLien href="/">Rejouer ↻</BoutonLien>
        <BoutonLien href="/classement" variante="contour">
          Voir le classement
        </BoutonLien>
      </div>
    </div>
  );
}

export default function PageResultat(props: PageProps<"/resultat/[partieId]">) {
  return (
    <Feuille>
      <Suspense fallback={<p role="status">Chargement du résultat…</p>}>
        <Resultat {...props} />
      </Suspense>
    </Feuille>
  );
}
