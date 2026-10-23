import type { Metadata } from "next";
import { BoutonLien } from "@/components/BoutonLien";
import { Bonhomme } from "@/components/Bonhomme";
import { Feuille } from "@/components/Feuille";
import { RESULTAT_DEMO } from "@/lib/donnees-demo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Résultat — MEMEQUIZZ",
  robots: { index: false },
};

const formatPoints = new Intl.NumberFormat("fr-FR");

// En v0.3 le résultat vient de la base d'après `partieId` (lu avec `await params`,
// sous <Suspense> avec Cache Components) ; ici, toujours la démo, sans lire le paramètre.
export default function PageResultat() {
  const r = RESULTAT_DEMO;
  return (
    <Feuille>
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
            sur {r.nombreJoueurs} joueurs
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
          <BoutonLien href="/jeu">Rejouer ↻</BoutonLien>
          <BoutonLien href="/classement" variante="contour">
            Voir le classement
          </BoutonLien>
        </div>
      </div>
    </Feuille>
  );
}
