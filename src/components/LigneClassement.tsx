import styles from "./LigneClassement.module.css";

type Props = {
  rang: number;
  pseudo: string;
  score: number;
  moi?: boolean;
  // Précision affichée après le pseudo (salle : « hôte », « a répondu »).
  note?: string;
};

const formatPoints = new Intl.NumberFormat("fr-FR");

export function LigneClassement({ rang, pseudo, score, moi = false, note }: Props) {
  return (
    <li className={`${styles.ligne} ${moi ? styles.moi : ""}`} value={rang}>
      <span className={styles.rang}>{rang}.</span>
      <span className={styles.pseudo}>
        {pseudo}
        {moi && " (toi)"}
        {note && <span className={styles.note}> · {note}</span>}
      </span>
      <span>{formatPoints.format(score)} pts</span>
    </li>
  );
}
