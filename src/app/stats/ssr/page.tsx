import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BlocStats } from "@/components/BlocStats";
import { Feuille } from "@/components/Feuille";
import { getDb } from "@/db";
import { lireStats } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Statistiques en SSR — MEMEQUIZZ",
  description: "Les statistiques du jeu, rendues par le serveur à chaque requête.",
};

// SSR : les chiffres sont lus en base à chaque requête (`connection()` écarte tout pré-rendu).
async function Stats() {
  await connection();
  return <BlocStats rendu="SSR" stats={await lireStats(getDb())} />;
}

export default function PageStatsSsr() {
  return (
    <Feuille>
      <h1>Statistiques (SSR)</h1>
      <Suspense fallback={<p role="status">Chargement des statistiques…</p>}>
        <Stats />
      </Suspense>
      <Link href="/stats">Comparer les trois rendus</Link>
    </Feuille>
  );
}
