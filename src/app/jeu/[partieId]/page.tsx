import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Feuille } from "@/components/Feuille";
import { identifiantUrlSchema } from "@/lib/validation";
import { Partie } from "../Partie";

export const metadata: Metadata = {
  title: "Partie — MEMEQUIZZ",
  robots: { index: false },
};

// `params` est une promesse (Next 16) : on la lit sous <Suspense> avec Cache Components.
async function Contenu({ params }: PageProps<"/jeu/[partieId]">) {
  const id = identifiantUrlSchema.safeParse((await params).partieId);
  if (!id.success) notFound();
  return <Partie idPartie={id.data} />;
}

export default function PageJeu(props: PageProps<"/jeu/[partieId]">) {
  return (
    <Feuille largeur="large">
      {/* Titre de page pour les lecteurs d'écran : h1 → h2 (question) → h3 (fiche du mème). */}
      <h1 className="masque-visuel">Partie en cours</h1>
      <Suspense fallback={<p role="status">Chargement de la partie…</p>}>
        <Contenu {...props} />
      </Suspense>
    </Feuille>
  );
}
