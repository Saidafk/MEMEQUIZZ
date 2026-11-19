import type { Metadata } from "next";
import { Feuille } from "@/components/Feuille";
import { NavRendus } from "@/components/NavRendus";
import { metadonneesPage } from "@/lib/seo";

export const metadata: Metadata = metadonneesPage({
  titre: "Statistiques — MEMEQUIZZ",
  description: "La même page de statistiques en trois rendus : CSR, SSR et SSG.",
  chemin: "/stats",
});

export default function PageStats() {
  return (
    <Feuille largeur="large" retour={{ href: "/", libelle: "Accueil" }}>
      <h1>Statistiques</h1>
      <p>
        La même page servie de trois façons : choisis un rendu pour comparer (voir
        docs/strategies-de-rendu.md).
      </p>
      <NavRendus details />
    </Feuille>
  );
}
