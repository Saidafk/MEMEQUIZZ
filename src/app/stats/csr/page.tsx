import type { Metadata } from "next";
import { Feuille } from "@/components/Feuille";
import { NavRendus } from "@/components/NavRendus";
import { metadonneesPage } from "@/lib/seo";
import { StatsClient } from "./StatsClient";

export const metadata: Metadata = metadonneesPage({
  titre: "Statistiques en CSR — MEMEQUIZZ",
  description: "Les statistiques du jeu, chargées dans le navigateur après l'affichage de la page.",
  chemin: "/stats/csr",
});

export default function PageStatsCsr() {
  return (
    <Feuille largeur="large" retour={{ href: "/stats", libelle: "Les trois rendus" }}>
      <h1>Statistiques (CSR)</h1>
      <NavRendus actif="CSR" />
      <StatsClient />
    </Feuille>
  );
}
