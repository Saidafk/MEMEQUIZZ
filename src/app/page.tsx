import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ActiverNotifications } from "@/components/ActiverNotifications";
import { BoutonLien } from "@/components/BoutonLien";
import carte from "@/components/Carte.module.css";
import { Feuille } from "@/components/Feuille";
import { getDb } from "@/db";
import { lireClassement } from "@/lib/classement";
import { DESCRIPTION_SITE, metadonneesPage } from "@/lib/seo";
import { FormulairePartie } from "./FormulairePartie";
import styles from "./page.module.css";

export const metadata: Metadata = metadonneesPage({
  titre: "MEMEQUIZZ",
  description: DESCRIPTION_SITE,
  chemin: "/",
});

const formatPoints = new Intl.NumberFormat("fr-FR");

// Top 3 du jour, lu à chaque visite sous <Suspense> : le reste de l'accueil reste statique. Si la
// base ne répond pas, l'encart disparaît plutôt que de casser la page d'accueil.
async function Top3() {
  await connection();
  const lignes = await lireClassement(getDb(), {
    periode: "aujourdhui",
    jetonHash: null,
    limite: 3,
  }).catch(() => null);
  if (lignes === null) return null;
  return lignes.length === 0 ? (
    <p>Personne n&apos;a encore joué aujourd&apos;hui. La première place est libre !</p>
  ) : (
    <ol className={styles.top}>
      {lignes.map((j, i) => (
        <li key={`${j.rang}-${i}`} value={j.rang}>
          <span>{j.rang}.</span>
          <span className={styles.pseudo}>{j.pseudo}</span>
          <span>{formatPoints.format(j.score)} pts</span>
        </li>
      ))}
    </ol>
  );
}

export default function Accueil() {
  return (
    <Feuille
      largeur="large"
      droite={
        <nav aria-label="Pages principales" className={styles.navigation}>
          <Link href="/classement">Classement</Link>
          <Link href="/salle">Jouer entre amis</Link>
          <Link href="/entrainement">Entraînement</Link>
        </nav>
      }
    >
      <div className={styles.accueil}>
        <div className={styles.texte}>
          <h1 className={styles.titre}>
            <span className={styles.surligne}>Reconnais</span>
            <br />
            le mème !
          </h1>
          <p className={styles.regles}>
            10 mèmes, 4 choix, 15 secondes. Plus tu réponds vite, plus tu marques.
          </p>
        </div>

        <section aria-labelledby="titre-top" className={`${carte.carte} ${styles.encartTop}`}>
          <h2 id="titre-top" className={styles.sousTitre}>
            Top 3 du jour
          </h2>
          <Suspense fallback={<p role="status">Chargement…</p>}>
            <Top3 />
          </Suspense>
          <Link href="/classement" className={styles.lien}>
            Voir tout le classement →
          </Link>
        </section>

        <section aria-labelledby="titre-solo" className={`${carte.carte} ${styles.solo}`}>
          <h2 id="titre-solo" className={carte.titre}>
            Partie solo
          </h2>
          <p>Seul contre le chrono. Ton score entre au classement.</p>
          <FormulairePartie />
        </section>

        <section aria-labelledby="titre-salle" className={`${carte.carte} ${styles.salle}`}>
          <h2 id="titre-salle" className={carte.titre}>
            Salle entre amis
          </h2>
          <p>Jusqu&apos;à 20 joueurs, les mêmes mèmes, le classement en direct.</p>
          <BoutonLien href="/salle" variante="contour">
            Créer ou rejoindre une salle →
          </BoutonLien>
          <p className={styles.note}>L&apos;hôte crée la salle et donne un code de 6 caractères.</p>
        </section>

        <footer className={styles.pied}>
          <p>Astuce : installe l&apos;appli pour t&apos;entraîner hors ligne.</p>
          <nav aria-label="Autres pages" className={styles.liens}>
            <Link href="/stats" className={styles.lien}>
              Statistiques
            </Link>
            <Link href="/credits" className={styles.lien}>
              Crédits des images
            </Link>
            <ActiverNotifications />
            <Link href="/admin" className={styles.lien}>
              Espace admin
            </Link>
          </nav>
        </footer>
      </div>
    </Feuille>
  );
}
