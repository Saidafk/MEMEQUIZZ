import type { Metadata } from "next";
import Link from "next/link";
import { Feuille } from "@/components/Feuille";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Hors ligne — MEMEQUIZZ",
};

// Page de secours : le service worker la précache et la sert quand une page
// n'est ni joignable ni déjà en cache (public/sw.js).
export default function HorsLigne() {
  return (
    <Feuille>
      <div className={styles.contenu}>
        <h1 className={styles.titre}>Pas de réseau</h1>
        <p>
          Cette page n&apos;est pas disponible sans connexion. Vérifie ta connexion à Internet, puis
          réessaie.
        </p>
        <Link className={styles.lien} href="/" prefetch={false}>
          Réessayer
        </Link>
      </div>
    </Feuille>
  );
}
