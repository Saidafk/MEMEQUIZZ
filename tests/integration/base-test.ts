import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, resolve } from "node:path";

// Les tests d'intégration vident le schéma public : ils ne tournent que sur une
// base locale dont le nom finit par « _test » (variable TEST_DATABASE_URL).
const url = process.env.TEST_DATABASE_URL;
const cible = url ? new URL(url) : null;

export const URL_BASE_TEST = url ?? "";
export const BASE_TEST_ACTIVE =
  cible !== null &&
  ["localhost", "127.0.0.1"].includes(cible.hostname) &&
  cible.pathname.slice(1).endsWith("_test");

// Garde-fou avant toute suppression dans un test (SCRUM-100). Un chemin vide ou relatif désigne le
// dossier courant, c'est-à-dire le projet : le 17/11/2026, rm("", { recursive: true }) l'a effacé.
// N'accepte qu'un dossier absolu, placé directement dans le dossier temporaire du système et nommé
// avec le préfixe attendu ; sinon, lève une erreur au lieu de supprimer.
export function dossierTemporaireSur(chemin: string, prefixe: string): string {
  const valide =
    chemin !== "" &&
    isAbsolute(chemin) &&
    dirname(resolve(chemin)) === resolve(tmpdir()) &&
    basename(resolve(chemin)).startsWith(prefixe) &&
    basename(resolve(chemin)).length > prefixe.length;
  if (!valide) {
    throw new Error(`Suppression refusée : « ${chemin} » n'est pas un dossier temporaire de test.`);
  }
  return resolve(chemin);
}
