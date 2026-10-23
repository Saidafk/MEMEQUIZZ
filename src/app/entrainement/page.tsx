import type { Metadata } from "next";
import { Feuille } from "@/components/Feuille";
import { Entrainement } from "./Entrainement";

export const metadata: Metadata = {
  title: "Entraînement — MEMEQUIZZ",
  robots: { index: false },
};

export default function PageEntrainement() {
  return (
    <Feuille largeur="large">
      {/* Titre de page pour les lecteurs d'écran : h1 → h2 (question) → h3 (fiche du mème). */}
      <h1 className="masque-visuel">Entraînement</h1>
      <Entrainement />
    </Feuille>
  );
}
