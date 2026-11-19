import type { Metadata } from "next";
import Link from "next/link";
import { Feuille } from "@/components/Feuille";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Hors ligne — MEMEQUIZZ",
  robots: { index: false },
};

// Page de secours : le service worker la précache et la sert quand une page
// n'est ni joignable ni déjà en cache (public/sw.js).
export default function HorsLigne() {
  return (
    <Feuille retour={{ href: "/", libelle: "Accueil" }}>
      <div className={styles.contenu}>
        <h1 className={styles.titre}>Pas de réseau</h1>
        <p>
          Cette page n&apos;est pas disponible sans connexion. Le jeu classé a besoin
          d&apos;Internet (le score est vérifié par le serveur). En attendant, tu peux
          t&apos;entraîner avec les mèmes déjà chargés.
        </p>
        <Link className={styles.lien} href="/entrainement" prefetch={false}>
          S&apos;entraîner hors ligne →
        </Link>
        <Link className={styles.secondaire} href="/" prefetch={false}>
          Réessayer ↻
        </Link>
      </div>
    </Feuille>
  );
}
