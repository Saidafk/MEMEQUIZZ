import type { Metadata } from "next";
import { Feuille } from "@/components/Feuille";
import { Partie } from "./Partie";

export const metadata: Metadata = {
  title: "Partie — MEMEQUIZZ",
  robots: { index: false },
};

export default function PageJeu() {
  return (
    <Feuille largeur="large">
      {/* Titre de page pour les lecteurs d'écran : h1 → h2 (question) → h3 (fiche du mème). */}
      <h1 className="masque-visuel">Partie en cours</h1>
      <Partie />
    </Feuille>
  );
}
