import type { Joueur } from "@/lib/types";
import styles from "./Podium.module.css";

const formatPoints = new Intl.NumberFormat("fr-FR");

// Ordre visuel : 2e, 1er, 3e. Les rangs restent écrits en chiffres (pas de médaille seule).
const ORDRE = [1, 0, 2] as const;

export function Podium({ joueurs }: { joueurs: Joueur[] }) {
  return (
    <ol className={styles.podium} aria-label="Les trois premiers">
      {ORDRE.map((i) => {
        const joueur = joueurs[i];
        if (!joueur) return null;
        const rang = i + 1;
        return (
          <li key={rang} className={`${styles.marche} ${styles[`rang${rang}`]}`} value={rang}>
            <span className={styles.nom}>{joueur.pseudo}</span>
            <span className={styles.points}>{formatPoints.format(joueur.score)}</span>
            <span className={styles.bloc} aria-hidden="true">
              {rang}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
