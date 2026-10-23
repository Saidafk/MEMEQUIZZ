import type { ReactNode } from "react";
import styles from "./Feuille.module.css";

type Props = {
  children: ReactNode;
  // « etroite » : colonne mobile (375 px) ; « large » : deux colonnes dès 1024 px.
  largeur?: "etroite" | "large";
};

// Page du cahier : marge rouge à gauche, contenu dans la colonne.
export function Feuille({ children, largeur = "etroite" }: Props) {
  return (
    <main className={`${styles.feuille} ${styles[largeur]}`}>
      <div className={styles.contenu}>{children}</div>
    </main>
  );
}
