import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { BlocStats } from "@/components/BlocStats";
import { Feuille } from "@/components/Feuille";
import { getDb } from "@/db";
import { type Stats, lireStats } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Statistiques en SSG — MEMEQUIZZ",
  description: "Les statistiques du jeu, préparées au build et régénérées toutes les heures.",
};

// SSG : calculées au build, puis régénérées au plus une fois par heure. Le build de l'image Docker
// n'a pas de base : les chiffres sont alors à zéro jusqu'à la première régénération.
async function chargerStats(): Promise<Stats> {
  "use cache";
  cacheLife("hours");
  if (!process.env.DATABASE_URL) {
    return {
      parties_terminees: 0,
      joueurs: 0,
      meilleur_score: 0,
      score_moyen: 0,
      memes_actifs: 0,
      produit_le: new Date().toISOString(),
    };
  }
  return lireStats(getDb());
}

export default async function PageStatsSsg() {
  return (
    <Feuille>
      <h1>Statistiques (SSG)</h1>
      <BlocStats rendu="SSG" stats={await chargerStats()} />
      <Link href="/stats">Comparer les trois rendus</Link>
    </Feuille>
  );
}
