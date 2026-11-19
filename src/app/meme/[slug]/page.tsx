import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { BoutonLien } from "@/components/BoutonLien";
import carte from "@/components/Carte.module.css";
import { Feuille } from "@/components/Feuille";
import { FicheMeme } from "@/components/FicheMeme";
import { getDb } from "@/db";
import { MEMES } from "@/db/data/memes";
import { lireMemeParSlug, listerSlugsMemesActifs, type PageMeme } from "@/lib/fiche-meme";
import { metadonneesPage } from "@/lib/seo";
import styles from "./page.module.css";

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
  if (!m) return { title: "Mème introuvable — MEMEQUIZZ", robots: { index: false } };
  return metadonneesPage({
    titre: `${m.nom} — MEMEQUIZZ`,
    description: m.origine ?? `La fiche du mème « ${m.nom} » : origine, sources et crédits.`,
    chemin: `/meme/${m.slug}`,
    image: m.image_chemin,
  });
}

async function Contenu({ params }: PageProps<"/meme/[slug]">) {
  const m = await chargerMeme((await params).slug);
  if (!m) notFound();

  return (
    <div className={carte.colonnes}>
      <Image
        src={m.image_chemin}
        alt={`Mème « ${m.nom} »`}
        width={400}
        height={320}
        // Largeur du contenu de la feuille étroite : 760 px en grand écran, sinon au plus 560 px
        // moins les marges intérieures (88 px).
        // Grand écran : colonne de gauche (5/12 de la feuille large, 500 px au plus). Sinon : au plus
        // 560 px moins les marges intérieures (88 px).
        sizes="(min-width: 1024px) 500px, min(560px, calc(100vw - 88px))"
        style={{ width: "100%", height: "auto" }}
        priority
      />
      <div className={styles.fiche}>
        <FicheMeme
          niveauTitre="h1"
          fiche={{ nom: m.nom, origine: m.origine ?? "" }}
          articleUrl={m.article_url}
          credits={{ auteur: m.auteur, licence: m.licence, sourceUrl: m.source_url }}
        />
        {m.annee_origine && <p>Apparu vers {m.annee_origine}.</p>}
        <BoutonLien href="/">Jouer à MEMEQUIZZ</BoutonLien>
      </div>
    </div>
  );
}

export default function PageMeme(props: PageProps<"/meme/[slug]">) {
  return (
    <Feuille largeur="large" retour={{ href: "/", libelle: "Accueil" }}>
      <Suspense fallback={<p role="status">Chargement du mème…</p>}>
        <Contenu {...props} />
      </Suspense>
    </Feuille>
  );
}
