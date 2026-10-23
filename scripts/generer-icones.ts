// Génère les icônes de la PWA dans public/icons/ (`bun run icones`).
// Un « M » à l'encre sur fond surligneur, aux couleurs des design tokens.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const FOND = "#fde047"; // --couleur-surligneur
const ENCRE = "#1e3a8a"; // --couleur-encre

// `marge` : part du côté laissée vide autour du « M » (zone de sécurité maskable : 10 %).
function svg(marge: number): string {
  const a = 512 * marge;
  const b = 512 - a;
  const haut = 512 * 0.3;
  const bas = 512 * 0.7;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${FOND}"/>
  <polyline points="${a},${bas} ${a},${haut} 256,${bas} ${b},${haut} ${b},${bas}"
    fill="none" stroke="${ENCRE}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const icones = [
  { fichier: "icon-192.png", taille: 192, marge: 0.22 },
  { fichier: "icon-512.png", taille: 512, marge: 0.22 },
  { fichier: "icon-maskable-512.png", taille: 512, marge: 0.3 },
];

await mkdir("public/icons", { recursive: true });
for (const { fichier, taille, marge } of icones) {
  await sharp(Buffer.from(svg(marge)))
    .resize(taille, taille)
    .png()
    .toFile(`public/icons/${fichier}`);
}
