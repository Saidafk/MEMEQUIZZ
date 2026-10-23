import sharp from "sharp";

// Conversion commune à l'import des images (db/importer-images.ts) et au backoffice :
// WebP, 800 px max, 100 Ko max (voir le skill meme-data, §4).
export const LARGEUR_MAX = 800;
export const POIDS_MAX = 100 * 1024;

export async function convertirEnWebp(source: Buffer): Promise<Buffer> {
  for (const qualite of [82, 74, 66, 58, 50, 42]) {
    const webp = await sharp(source)
      .resize({ width: LARGEUR_MAX, height: LARGEUR_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: qualite })
      .toBuffer();
    if (webp.length <= POIDS_MAX) return webp;
  }
  throw new Error("image trop lourde même à la qualité minimale");
}
