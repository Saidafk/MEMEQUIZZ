import type { Metadata } from "next";
import { Bonhomme } from "@/components/Bonhomme";
import { Feuille } from "@/components/Feuille";
import { Logo } from "@/components/Logo";
import { DESCRIPTION_SITE, metadonneesPage } from "@/lib/seo";
import { FormulairePartie } from "./FormulairePartie";
import styles from "./page.module.css";

export const metadata: Metadata = metadonneesPage({
  titre: "MEMEQUIZZ",
  description: DESCRIPTION_SITE,
  chemin: "/",
});

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
