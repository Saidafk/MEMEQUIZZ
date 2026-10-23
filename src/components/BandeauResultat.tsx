import styles from "./BandeauResultat.module.css";

type Props = {
  reussi: boolean;
  points: number;
  // Libellé du détail, ex. « en 4 secondes » ou « temps écoulé ».
  detail: string;
};

// Le conteneur `role="status"` reste monté dans la page de jeu : c'est le changement de son
// contenu qui est annoncé aux lecteurs d'écran, sans déplacer le focus.
export function BandeauResultat({ reussi, points, detail }: Props) {
  return (
    <div className={`${styles.bandeau} ${reussi ? styles.reussi : styles.rate}`}>
      <p className={styles.titre}>{reussi ? "✓ Bonne réponse !" : "✗ Raté !"}</p>
      <p>
        {reussi ? `+${points} pts` : "+0 pt"} · {detail}
      </p>
    </div>
  );
}
