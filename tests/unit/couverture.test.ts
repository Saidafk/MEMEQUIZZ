import { describe, expect, test } from "bun:test";

import { lireLcov, taux } from "../../scripts/verifier-couverture";

const LCOV = [
  "TN:",
  "SF:src/a.ts",
  "LF:10",
  "LH:8",
  "end_of_record",
  "SF:src/b.ts",
  "LF:30",
  "LH:15",
  "end_of_record",
].join("\n");

describe("seuil global de couverture (SCRUM-64)", () => {
  test("additionne les lignes de tous les fichiers", () => {
    expect(lireLcov(LCOV)).toEqual({ lignes: 40, lignesCouvertes: 23, fichiers: 2 });
  });

  test("calcule le taux global, pas la moyenne des fichiers", () => {
    // 23/40 = 57,5 % ; la moyenne des fichiers (80 % et 50 %) donnerait 65 %.
    expect(taux(lireLcov(LCOV))).toBeCloseTo(0.575);
  });

  test("lit les fins de ligne Windows", () => {
    expect(lireLcov(LCOV.replaceAll("\n", "\r\n")).lignes).toBe(40);
  });

  test("un rapport vide vaut 0 : la CI échoue au lieu de passer", () => {
    expect(taux(lireLcov(""))).toBe(0);
  });
});
