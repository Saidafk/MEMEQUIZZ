import type { Stats } from "@/lib/stats";
import styles from "./BlocStats.module.css";

export type ModeRendu = "CSR" | "SSR" | "SSG";

const nombre = new Intl.NumberFormat("fr-FR");
// Fuseau fixé : le même texte est produit sur le serveur et dans le navigateur.
const heure = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Europe/Paris",
});

const LIBELLES: Record<ModeRendu, string> = {
  CSR: "dans le navigateur, après le chargement de la page",
  SSR: "sur le serveur, à chaque requête",
  SSG: "sur le serveur, au build puis régénérée toutes les heures",
};

// Une seule présentation pour les trois modes de rendu : on compare le rendu, pas l'interface.
export function BlocStats({ stats, rendu }: { stats: Stats; rendu: ModeRendu }) {
  return (
    <section className={styles.bloc} aria-labelledby={`titre-stats-${rendu}`}>
      <h2 id={`titre-stats-${rendu}`} className={styles.titre}>
        Rendu {rendu}
      </h2>
      <dl className={styles.liste}>
        <div>
          <dt>Parties terminées</dt>
          <dd>{nombre.format(stats.parties_terminees)}</dd>
        </div>
        <div>
          <dt>Joueurs</dt>
          <dd>{nombre.format(stats.joueurs)}</dd>
        </div>
        <div>
          <dt>Meilleur score</dt>
          <dd>{nombre.format(stats.meilleur_score)} pts</dd>
        </div>
        <div>
          <dt>Score moyen</dt>
          <dd>{nombre.format(stats.score_moyen)} pts</dd>
        </div>
        <div>
          <dt>Mèmes actifs</dt>
          <dd>{nombre.format(stats.memes_actifs)}</dd>
        </div>
      </dl>
      <p className={styles.note}>
        Page construite {LIBELLES[rendu]}. Chiffres lus le{" "}
        {heure.format(new Date(stats.produit_le))}.
      </p>
    </section>
  );
}
