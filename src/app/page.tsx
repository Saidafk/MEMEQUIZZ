import { Bonhomme } from "@/components/Bonhomme";
import { Feuille } from "@/components/Feuille";
import { Logo } from "@/components/Logo";
import { FormulairePartie } from "./FormulairePartie";
import styles from "./page.module.css";

export default function Accueil() {
  return (
    <Feuille largeur="large">
      <div className={styles.accueil}>
        <Logo />
        <div className={styles.texte}>
          <h1 className={styles.titre}>
            <span className={styles.surligne}>Reconnais</span>
            <br />
            le mème !
          </h1>
          <p className={styles.regles}>
            10 mèmes, 4 choix, 15 secondes.
            <br />
            Plus tu réponds vite, plus tu marques.
          </p>
        </div>
        <div className={styles.dessin}>
          <Bonhomme />
        </div>
        <FormulairePartie />
      </div>
    </Feuille>
  );
}
