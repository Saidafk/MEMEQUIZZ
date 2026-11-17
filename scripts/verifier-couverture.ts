// Seuil global de couverture (SCRUM-64) : `bun run couverture:seuil` après `bun run test:couverture`.
// Lit coverage/lcov.info, additionne les lignes de tous les fichiers et échoue sous SEUIL_LIGNES.
// Le seuil est volontairement un peu sous la valeur mesurée : il empêche la couverture de baisser
// sans bloquer sur une variation d'une ligne.
import { readFileSync } from "node:fs";

// Mesuré en CI le 17/11/2026 : 95,12 % (1 266 lignes sur 1 331, tous les tests sur PostgreSQL).
export const SEUIL_LIGNES = 0.92;

export type Couverture = { lignes: number; lignesCouvertes: number; fichiers: number };

// Format lcov : un bloc par fichier, `LF:` = lignes instrumentées, `LH:` = lignes exécutées.
export function lireLcov(contenu: string): Couverture {
  let lignes = 0;
  let lignesCouvertes = 0;
  let fichiers = 0;
  for (const ligne of contenu.split(/\r?\n/)) {
    if (ligne.startsWith("SF:")) fichiers += 1;
    else if (ligne.startsWith("LF:")) lignes += Number(ligne.slice(3)) || 0;
    else if (ligne.startsWith("LH:")) lignesCouvertes += Number(ligne.slice(3)) || 0;
  }
  return { lignes, lignesCouvertes, fichiers };
}

// Aucun fichier mesuré : 0, pour qu'un rapport vide fasse échouer la CI au lieu de passer.
export function taux({ lignes, lignesCouvertes }: Couverture): number {
  return lignes === 0 ? 0 : lignesCouvertes / lignes;
}

if (import.meta.main) {
  const chemin = process.argv[2] ?? "coverage/lcov.info";
  let contenu: string;
  try {
    contenu = readFileSync(chemin, "utf8");
  } catch {
    console.error(`Rapport introuvable : ${chemin}. Lancer d'abord « bun run test:couverture ».`);
    process.exit(1);
  }
  const couverture = lireLcov(contenu);
  const pourcent = (x: number) => `${(x * 100).toFixed(2)} %`;
  const mesure = taux(couverture);
  console.log(
    `Couverture des lignes : ${pourcent(mesure)} (${couverture.lignesCouvertes}/${couverture.lignes}, ` +
      `${couverture.fichiers} fichiers) ; seuil : ${pourcent(SEUIL_LIGNES)}`,
  );
  if (mesure < SEUIL_LIGNES) {
    console.error("Couverture sous le seuil : ajoute des tests pour le code non couvert.");
    process.exit(1);
  }
}
