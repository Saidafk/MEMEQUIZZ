import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BlocStats } from "@/components/BlocStats";
import { Feuille } from "@/components/Feuille";
import { NavRendus } from "@/components/NavRendus";
import { getDb } from "@/db";
import { metadonneesPage } from "@/lib/seo";
import { lireStats } from "@/lib/stats";

export const metadata: Metadata = metadonneesPage({
  titre: "Statistiques en SSR — MEMEQUIZZ",
  description: "Les statistiques du jeu, rendues par le serveur à chaque requête.",
  chemin: "/stats/ssr",
});

// SSR : les chiffres sont lus en base à chaque requête (`connection()` écarte tout pré-rendu).
async function Stats() {
  await connection();
  return <BlocStats rendu="SSR" stats={await lireStats(getDb())} />;
}

export default function PageStatsSsr() {
  return (
    <Feuille largeur="large" retour={{ href: "/stats", libelle: "Les trois rendus" }}>
      <h1>Statistiques (SSR)</h1>
      <NavRendus actif="SSR" />
      <Suspense fallback={<p role="status">Chargement des statistiques…</p>}>
        <Stats />
      </Suspense>
    </Feuille>
  );
}
