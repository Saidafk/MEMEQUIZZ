import type { Metadata } from "next";
import Link from "next/link";
import { Feuille } from "@/components/Feuille";
import { metadonneesPage } from "@/lib/seo";
import { StatsClient } from "./StatsClient";

export const metadata: Metadata = metadonneesPage({
  titre: "Statistiques en CSR — MEMEQUIZZ",
  description: "Les statistiques du jeu, chargées dans le navigateur après l'affichage de la page.",
  chemin: "/stats/csr",
});

export default function PageStatsCsr() {
  return (
    <Feuille>
      <h1>Statistiques (CSR)</h1>
      <StatsClient />
      <Link href="/stats">Comparer les trois rendus</Link>
    </Feuille>
  );
}
