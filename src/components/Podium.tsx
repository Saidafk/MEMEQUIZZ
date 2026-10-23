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
        // La disposition suit l'ordre d'affichage ; le rang annoncé est le vrai (égalité : 1er, 1er, 3e).
        const position = i + 1;
        const rang = joueur.rang ?? position;
        const libelle = joueur.rang === undefined ? libelleRang : rang === 1 ? "1er" : `${rang}e`;
        return (
          <li
            key={position}
            className={`${styles.marche} ${styles[`rang${position}`]}`}
            value={rang}
          >
            <span className="masque-visuel">{libelle} : </span>
            <span className={styles.nom}>
              {joueur.pseudo}
              {joueur.moi && <span className="masque-visuel"> (toi)</span>}
            </span>
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
