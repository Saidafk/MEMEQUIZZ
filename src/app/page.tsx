import Link from "next/link";
import { Bonhomme } from "@/components/Bonhomme";
import { BoutonLien } from "@/components/BoutonLien";
import { Feuille } from "@/components/Feuille";
import { Logo } from "@/components/Logo";
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
        <form className={styles.formulaire} action="/jeu">
          <label htmlFor="pseudo" className={styles.etiquette}>
            Ton pseudo
          </label>
          <input
            id="pseudo"
            name="pseudo"
            className={styles.champ}
            placeholder="ex. Gribouille42"
            autoComplete="nickname"
            maxLength={20}
          />
          <BoutonLien href="/jeu">C&apos;est parti →</BoutonLien>
          <Link href="/classement" className={styles.lien}>
            Voir le classement
          </Link>
        </form>
      </div>
    </Feuille>
  );
}
