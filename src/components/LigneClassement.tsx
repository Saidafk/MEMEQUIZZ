import styles from "./LigneClassement.module.css";

type Props = {
  rang: number;
  pseudo: string;
  score: number;
  moi?: boolean;
};

const formatPoints = new Intl.NumberFormat("fr-FR");

export function LigneClassement({ rang, pseudo, score, moi = false }: Props) {
  return (
    <li className={`${styles.ligne} ${moi ? styles.moi : ""}`} value={rang}>
      <span className={styles.rang}>{rang}.</span>
      <span className={styles.pseudo}>
        {pseudo}
        {moi && " (toi)"}
      </span>
      <span>{formatPoints.format(score)} pts</span>
    </li>
  );
}
