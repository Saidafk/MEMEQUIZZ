import type { FicheMeme as Fiche } from "@/lib/types";
import styles from "./FicheMeme.module.css";

export function FicheMeme({ fiche }: { fiche: Fiche }) {
  return (
    <article className={styles.fiche}>
      <h3 className={styles.nom}>
        <span className={styles.surligne}>{fiche.nom}</span>
      </h3>
      <p className={styles.origine}>{fiche.origine}</p>
      <p>{fiche.description}</p>
      <p className={styles.source}>{fiche.source}</p>
    </article>
  );
}
