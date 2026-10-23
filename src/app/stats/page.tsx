import type { Metadata } from "next";
import Link from "next/link";
import { Feuille } from "@/components/Feuille";

export const metadata: Metadata = {
  title: "Statistiques — MEMEQUIZZ",
  description: "La même page de statistiques en trois rendus : CSR, SSR et SSG.",
};

export default function PageStats() {
  return (
    <Feuille>
      <h1>Statistiques</h1>
      <p>
        Les mêmes chiffres, affichés avec trois stratégies de rendu pour les comparer (voir
        docs/strategies-de-rendu.md).
      </p>
      <ul>
        <li>
          <Link href="/stats/csr">CSR</Link> : construite dans le navigateur.
        </li>
        <li>
          <Link href="/stats/ssr">SSR</Link> : construite par le serveur à chaque requête.
        </li>
        <li>
          <Link href="/stats/ssg">SSG</Link> : préparée au build, régénérée toutes les heures.
        </li>
      </ul>
      <Link href="/">Retour à l&apos;accueil</Link>
    </Feuille>
  );
}
