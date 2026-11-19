import type { Metadata } from "next";
import carte from "@/components/Carte.module.css";
import { Feuille } from "@/components/Feuille";
import { metadonneesPage } from "@/lib/seo";
import { FormulaireSalle } from "./FormulaireSalle";
import styles from "./salle.module.css";

export const metadata: Metadata = metadonneesPage({
  titre: "Jouer entre amis — MEMEQUIZZ",
  description: "Crée une salle MEMEQUIZZ et partage son code, ou rejoins celle d'un ami.",
  chemin: "/salle",
});

export default function PageSalle() {
  return (
    <Feuille largeur="large" retour={{ href: "/", libelle: "Accueil" }}>
      <div className={styles.page}>
        <h1 className={styles.titre}>Jouer entre amis</h1>
        <p>Les mêmes 10 mèmes pour tout le monde, au même rythme, avec le classement en direct.</p>
        <div className={styles.colonnes}>
          <section aria-labelledby="titre-creer" className={carte.carte}>
            <h2 id="titre-creer" className={carte.titre}>
              Créer une salle
            </h2>
            <p>
              Tu reçois un code à partager, puis tu lances la partie quand tout le monde est là.
            </p>
            <FormulaireSalle mode="creer" />
          </section>
          <section aria-labelledby="titre-rejoindre" className={carte.carte}>
            <h2 id="titre-rejoindre" className={carte.titre}>
              Rejoindre une salle
            </h2>
            <p>Saisis le code donné par l&apos;hôte.</p>
            <FormulaireSalle mode="rejoindre" />
          </section>
        </div>
        <ol className={styles.etapes} aria-label="Comment ça marche">
          <li>1. Crée la salle</li>
          <li>2. Partage le code</li>
          <li>3. Lance quand tout le monde est là</li>
        </ol>
      </div>
    </Feuille>
  );
}
