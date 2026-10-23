import type { Joueur } from "@/lib/types";
import styles from "./Podium.module.css";

const formatPoints = new Intl.NumberFormat("fr-FR");
const RANGS = ["1er", "2e", "3e"] as const;

// Le DOM suit l'ordre de lecture (1er, 2e, 3e) ; la disposition visuelle 2-1-3 est faite en CSS.
// Le bloc chiffré est décoratif : le rang est annoncé par le texte masqué.
export function Podium({ joueurs }: { joueurs: Joueur[] }) {
  return (
    <ol className={styles.podium} aria-label="Les trois premiers">
      {RANGS.map((libelleRang, i) => {
        const joueur = joueurs[i];
        if (!joueur) return null;
        const rang = i + 1;
        return (
          <li key={rang} className={`${styles.marche} ${styles[`rang${rang}`]}`} value={rang}>
            <span className="masque-visuel">{libelleRang} : </span>
            <span className={styles.nom}>{joueur.pseudo}</span>
            <span className={styles.points}>{formatPoints.format(joueur.score)}</span>
            <span className="masque-visuel"> pts</span>
            <span className={styles.bloc} aria-hidden="true">
              {rang}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
