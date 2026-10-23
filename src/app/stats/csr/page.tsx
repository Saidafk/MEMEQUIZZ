import type { Metadata } from "next";
import Link from "next/link";
import { Feuille } from "@/components/Feuille";
import { StatsClient } from "./StatsClient";

export const metadata: Metadata = {
  title: "Statistiques en CSR — MEMEQUIZZ",
  description: "Les statistiques du jeu, chargées dans le navigateur après l'affichage de la page.",
};

export default function PageStatsCsr() {
  return (
    <Feuille>
      <h1>Statistiques (CSR)</h1>
      <StatsClient />
      <Link href="/stats">Comparer les trois rendus</Link>
    </Feuille>
  );
}
