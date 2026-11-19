import { describe, expect, test } from "bun:test";

import { creerCompteurFlux, evenementSse } from "@/lib/flux-sse";
import { ALPHABET_CODE, classerJoueurs, genererCode } from "@/lib/salles";
import { codeSalleSchema } from "@/lib/validation";

describe("code de salle (SCRUM-83)", () => {
  test("le code généré est toujours accepté par le schéma, sans caractère ambigu", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = genererCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      expect(code).not.toMatch(/[IO01]/);
      expect(codeSalleSchema.parse(code)).toBe(code);
    }
    expect(ALPHABET_CODE).toHaveLength(32);
  });

  test("la saisie est normalisée (espaces, minuscules) et les codes impossibles refusés", () => {
    expect(codeSalleSchema.parse("  k7m2qx ")).toBe("K7M2QX");
    for (const invalide of ["K7M2Q", "K7M2QXA", "K7M2Q0", "IOIOIO", "K7M-QX", "../../x"]) {
      expect(codeSalleSchema.safeParse(invalide).success).toBe(false);
    }
  });
});

describe("classement de la salle (SCRUM-84)", () => {
  test("meilleur score d'abord ; à égalité, même rang et le suivant saute", () => {
    const classe = classerJoueurs([
      { pseudo: "Bob", score: 500 },
      { pseudo: "Alice", score: 900 },
      { pseudo: "Chloé", score: 500 },
      { pseudo: "Dan", score: 0 },
    ]);
    expect(classe.map((j) => [j.pseudo, j.rang])).toEqual([
      ["Alice", 1],
      ["Bob", 2],
      ["Chloé", 2],
      ["Dan", 4],
    ]);
  });
});

describe("flux SSE (SCRUM-84)", () => {
  test("un événement est une ligne data: terminée par une ligne vide", () => {
    // Le saut de ligne d'une valeur est échappé par JSON : il ne coupe pas l'événement en deux.
    expect(evenementSse({ a: "x\ny" })).toBe(`data: {"a":"x${"\\"}ny"}\n\n`);
  });

  test("le nombre de flux ouverts est borné par session et au total", () => {
    const compteur = creerCompteurFlux({ maxParCle: 2, maxTotal: 3 });
    expect(compteur.acquerir("a")).toBe(true);
    expect(compteur.acquerir("a")).toBe(true);
    expect(compteur.acquerir("a")).toBe(false);
    expect(compteur.acquerir("b")).toBe(true);
    expect(compteur.acquerir("c")).toBe(false);
    compteur.liberer("a");
    expect(compteur.acquerir("c")).toBe(true);
    // Libérer plus que ce qui a été pris ne fait pas passer le total en négatif.
    compteur.liberer("z");
    expect(compteur.acquerir("d")).toBe(false);
  });
});
