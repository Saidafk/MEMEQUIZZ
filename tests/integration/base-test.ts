// Les tests d'intégration vident le schéma public : ils ne tournent que sur une
// base locale dont le nom finit par « _test » (variable TEST_DATABASE_URL).
const url = process.env.TEST_DATABASE_URL;
const cible = url ? new URL(url) : null;

export const URL_BASE_TEST = url ?? "";
export const BASE_TEST_ACTIVE =
  cible !== null &&
  ["localhost", "127.0.0.1"].includes(cible.hostname) &&
  cible.pathname.slice(1).endsWith("_test");
