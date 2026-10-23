import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { LARGEUR_MAX, convertirEnWebp } from "../lib/image-meme";
import { MEMES } from "./data/memes";

// Télécharge les images de data/memes.ts depuis Wikimedia Commons (copie locale,
// jamais de hotlink) et les convertit en WebP : 800 px max, 100 Ko max.
// Usage : bun src/db/importer-images.ts [--force]
const DOSSIER = join(process.cwd(), "public", "memes");
const USER_AGENT = "MEMEQUIZZ-school-project/0.3 (https://github.com/Saidafk/MEMEQUIZZ)";
const forcer = process.argv.includes("--force");

await mkdir(DOSSIER, { recursive: true });
let echecs = 0;

for (const meme of MEMES) {
  const cible = join(DOSSIER, `${meme.slug}.webp`);
  if (existsSync(cible) && !forcer) {
    console.log(`= ${meme.slug} (déjà présent)`);
    continue;
  }
  try {
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
      meme.fichier_commons.replaceAll(" ", "_"),
    )}?width=${LARGEUR_MAX}`;
    const reponse = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const webp = await convertirEnWebp(Buffer.from(await reponse.arrayBuffer()));
    await writeFile(cible, webp);
    console.log(`+ ${meme.slug} (${Math.round(webp.length / 1024)} Ko)`);
  } catch (erreur) {
    echecs += 1;
    console.error(`! ${meme.slug} : ${erreur instanceof Error ? erreur.message : erreur}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 800)); // politesse envers Commons
}

if (echecs > 0) process.exit(1);
