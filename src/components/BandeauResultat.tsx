import styles from "./BandeauResultat.module.css";

type Props = {
  reussi: boolean;
  points: number;
  // Libellé du détail, ex. « en 4,2 secondes » ou « temps écoulé ».
  detail: string;
};

// role="status" : le résultat est annoncé aux lecteurs d'écran sans déplacer le focus.
export function BandeauResultat({ reussi, points, detail }: Props) {
  return (
    <div role="status" className={`${styles.bandeau} ${reussi ? styles.reussi : styles.rate}`}>
      <p className={styles.titre}>{reussi ? "✓ Bonne réponse !" : "✗ Raté !"}</p>
      <p>
        {reussi ? `+${points} pts` : "+0 pt"} · {detail}
      </p>
    </div>
  );
}
