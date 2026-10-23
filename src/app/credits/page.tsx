import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Feuille } from "@/components/Feuille";
import { getDb } from "@/db";
import { imageAdaptee, libelleLicence } from "@/lib/licences";
import { listerMemes } from "@/lib/memes-admin";

export const metadata: Metadata = {
  title: "Crédits — MEMEQUIZZ",
};

async function Liste() {
  await connection();
  const memes = (await listerMemes(getDb())).filter((m) => m.actif);
  return (
    <ul>
      {memes.map((m) => (
        <li key={m.id_meme}>
          <strong>{m.nom}</strong> — image de {m.auteur}, {libelleLicence(m.licence)}
          {imageAdaptee(m.licence) ? ", réduite et convertie en WebP" : ""}.{" "}
          <a href={m.source_url} target="_blank" rel="noopener noreferrer">
            Source
            <span className="masque-visuel"> de {m.nom} (s&apos;ouvre dans un nouvel onglet)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function PageCredits() {
  return (
    <Feuille largeur="large">
      <h1>Crédits des images</h1>
      <p>Toutes les images sont sous licence libre, copiées sur le serveur.</p>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Liste />
      </Suspense>
      <Link href="/">Retour à l&apos;accueil</Link>
    </Feuille>
  );
}
