import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { BoutonLien } from "@/components/BoutonLien";
import { Feuille } from "@/components/Feuille";
import { FicheMeme } from "@/components/FicheMeme";
import { getDb } from "@/db";
import { MEMES } from "@/db/data/memes";
import { lireMemeParSlug, listerSlugsMemesActifs, type PageMeme } from "@/lib/fiche-meme";

// `next build` dans l'image Docker n'a pas de base. Cache Components exige au moins une page au
// build : sans DATABASE_URL, on part de la liste curée du dépôt (les mèmes importés ou ajoutés
// depuis le backoffice sont alors générés à la première visite, `dynamicParams` valant true).
function memeCure(slug: string): PageMeme | null {
  const m = MEMES.find((x) => x.slug === slug);
  if (!m) return null;
  return {
    slug: m.slug,
    nom: m.nom,
    annee_origine: m.annee_origine,
    origine: m.origine,
    article_url: m.article_url,
    image_chemin: `/memes/${m.slug}.webp`,
    auteur: m.auteur,
    licence: m.licence,
    source_url: m.source_url,
  };
}

// Mis en cache une heure : une fiche modifiée dans le backoffice se rafraîchit ensuite d'elle-même.
async function chargerMeme(slug: string): Promise<PageMeme | null> {
  "use cache";
  cacheLife("hours");
  return process.env.DATABASE_URL ? lireMemeParSlug(getDb(), slug) : memeCure(slug);
}

// Une page par mème, générée au build (SCRUM-51).
export async function generateStaticParams() {
  const slugs = process.env.DATABASE_URL
    ? await listerSlugsMemesActifs(getDb())
    : MEMES.map((m) => m.slug);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/meme/[slug]">): Promise<Metadata> {
  const m = await chargerMeme((await params).slug);
  if (!m) return { title: "Mème introuvable — MEMEQUIZZ" };
  return {
    title: `${m.nom} — MEMEQUIZZ`,
    description: m.origine ?? `La fiche du mème « ${m.nom} » : origine, sources et crédits.`,
  };
}

async function Contenu({ params }: PageProps<"/meme/[slug]">) {
  const m = await chargerMeme((await params).slug);
  if (!m) notFound();

  return (
    <>
      <Image
        src={m.image_chemin}
        alt={`Mème « ${m.nom} »`}
        width={400}
        height={320}
        unoptimized
        style={{ width: "100%", height: "auto" }}
        priority
      />
      <FicheMeme
        niveauTitre="h1"
        fiche={{ nom: m.nom, origine: m.origine ?? "" }}
        articleUrl={m.article_url}
        credits={{ auteur: m.auteur, licence: m.licence, sourceUrl: m.source_url }}
      />
      {m.annee_origine && <p>Apparu vers {m.annee_origine}.</p>}
    </>
  );
}

export default function PageMeme(props: PageProps<"/meme/[slug]">) {
  return (
    <Feuille>
      <Suspense fallback={<p role="status">Chargement du mème…</p>}>
        <Contenu {...props} />
      </Suspense>
      <BoutonLien href="/">Jouer à MEMEQUIZZ</BoutonLien>
    </Feuille>
  );
}
