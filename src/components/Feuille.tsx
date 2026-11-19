import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import styles from "./Feuille.module.css";

export type Retour = {
  href: string;
  // Texte visible après la flèche : « Accueil », « Quitter la partie »…
  libelle: string;
  // « ✕ » pour quitter une partie ou une salle, « ← » pour revenir en arrière.
  quitter?: boolean;
};

type Props = {
  children: ReactNode;
  // « etroite » : une colonne ; « large » : deux colonnes dès 1024 px.
  largeur?: "etroite" | "large";
  // Bouton retour en haut à droite (maquette v1.1) : toutes les pages sauf l'accueil.
  retour?: Retour;
  // Contenu libre à droite de l'en-tête (navigation de l'accueil).
  droite?: ReactNode;
};

// Page du cahier : marge rouge à gauche, en-tête (logo qui ramène à l'accueil), puis le contenu.
export function Feuille({ children, largeur = "etroite", retour, droite }: Props) {
  return (
    <main className={`${styles.feuille} ${styles[largeur]}`}>
      <div className={styles.contenu}>
        <header className={styles.entete}>
          <Link href="/" className={styles.logo}>
            <Logo />
            <span className="masque-visuel"> : accueil</span>
          </Link>
          {retour && (
            <Link href={retour.href} className={styles.retour}>
              <span aria-hidden="true">{retour.quitter ? "✕" : "←"}</span> {retour.libelle}
            </Link>
          )}
          {droite}
        </header>
        {children}
      </div>
    </main>
  );
}
