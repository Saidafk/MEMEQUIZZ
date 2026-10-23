import { DUREE_QUESTION_S } from "@/lib/score";
import styles from "./Chrono.module.css";

const SEUIL_URGENT_S = 5;

type Props = {
  restant: number;
  total?: number;
};

// Composant d'affichage : le décompte lui-même est géré par la page de jeu.
export function Chrono({ restant, total: totalDemande = DUREE_QUESTION_S }: Props) {
  const total = totalDemande > 0 ? totalDemande : DUREE_QUESTION_S;
  const secondes = Number.isFinite(restant) ? Math.max(0, Math.min(total, Math.ceil(restant))) : 0;
  const urgent = secondes <= SEUIL_URGENT_S;
  return (
    <div className={`${styles.chrono} ${urgent ? styles.urgent : ""}`}>
      <div
        className={styles.piste}
        role="progressbar"
        aria-label="Temps restant"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={secondes}
        aria-valuetext={`${secondes} secondes`}
      >
        <div className={styles.remplissage} style={{ width: `${(secondes / total) * 100}%` }} />
      </div>
      <span className={styles.secondes} aria-hidden="true">
        {secondes} s
      </span>
    </div>
  );
}
