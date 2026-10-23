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
      <Partie />
    </Feuille>
  );
}
