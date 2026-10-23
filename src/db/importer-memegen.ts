import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { convertirEnWebp } from "../lib/image-meme";
import { genererSql, ligneImport, slugsUniques, type ModeleMemegen } from "../lib/memegen";
import { meme } from "./schema";

// Importe TOUS les modèles de memegen.link, sans filtre (SCRUM-97). Leurs images sont des œuvres
// protégées dont les droits ne sont pas vérifiés : licence « non_verifiee », jamais « libre ».
// Rejouable : les images déjà présentes ne sont pas retéléchargées (sauf --force).
//
// Usage : bun run import:memegen [--force] [--sql-seulement]
//   écrit les images dans public/memes/ (ignorées par git) et memegen-import.sql (ignoré aussi) ;
//   insère aussi en base (DATABASE_URL), sauf avec --sql-seulement.
const DOSSIER = join(process.cwd(), "public", "memes");
const API = "https://api.memegen.link/templates/";
const USER_AGENT = "MEMEQUIZZ-school-project/0.4 (https://github.com/Saidafk/MEMEQUIZZ)";
const forcer = process.argv.includes("--force");
const sqlSeulement = process.argv.includes("--sql-seulement");
const PARALLELE = 4;

async function telecharger(url: string): Promise<Buffer> {
  for (let essai = 1; ; essai += 1) {
    try {
      const reponse = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      return Buffer.from(await reponse.arrayBuffer());
    } catch (erreur) {
      if (essai >= 3) throw erreur;
      await new Promise((resolve) => setTimeout(resolve, 500 * essai));
    }
  }
}

const reponse = await fetch(API, { headers: { "User-Agent": USER_AGENT } });
if (!reponse.ok) throw new Error(`memegen.link : HTTP ${reponse.status}`);
const modeles = (await reponse.json()) as ModeleMemegen[];
console.log(`${modeles.length} modèles chez memegen.link`);

await mkdir(DOSSIER, { recursive: true });
const reussis: ReturnType<typeof ligneImport>[] = [];
const echecs: string[] = [];
let suivant = 0;

const slugs = slugsUniques(modeles);

async function traiter(modele: ModeleMemegen, slug: string) {
  const ligne = ligneImport(modele, slug);
  const cible = join(DOSSIER, `${ligne.slug}.webp`);
  try {
    if (forcer || !existsSync(cible)) {
      await writeFile(cible, await convertirEnWebp(await telecharger(modele.blank)));
    }
    reussis.push(ligne);
  } catch (erreur) {
    echecs.push(`${modele.id} : ${erreur instanceof Error ? erreur.message : erreur}`);
  }
}

await Promise.all(
  Array.from({ length: PARALLELE }, async () => {
    while (suivant < modeles.length) {
      const i = suivant++;
      await traiter(modeles[i]!, slugs[i]!);
    }
  }),
);

reussis.sort((a, b) => a.slug.localeCompare(b.slug));
await writeFile(join(process.cwd(), "memegen-import.sql"), genererSql(reussis));
console.log(`${reussis.length} images prêtes, SQL écrit dans memegen-import.sql`);
for (const e of echecs) console.error(`! ${e}`);

if (!sqlSeulement && reussis.length > 0) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL est manquante (voir .env.example, ou --sql-seulement)");
  const client = postgres(url, { max: 1 });
  try {
    const db = drizzle(client);
    await db
      .insert(meme)
      .values(reussis.map((l) => ({ ...l, actif: true, via_backoffice: true })))
      .onConflictDoUpdate({
        target: meme.slug,
        set: {
          nom: sql`excluded.nom`,
          source_url: sql`excluded.source_url`,
          image_chemin: sql`excluded.image_chemin`,
          licence: sql`excluded.licence`,
        },
      });
    console.log(`${reussis.length} mèmes insérés ou mis à jour en base.`);
  } finally {
    await client.end();
  }
}

if (echecs.length > 0) process.exit(1);
