import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { melanger, reponseErreurQuestion, resoudreFichierImage } from "@/lib/questions";
import { genererJeton, hasherJeton } from "@/lib/session";

describe("melanger", () => {
  test("renvoie une permutation sans toucher l'original", () => {
    const original = [1, 2, 3, 4];
    const resultat = melanger(original);
    expect([...resultat].sort()).toEqual([1, 2, 3, 4]);
    expect(original).toEqual([1, 2, 3, 4]);
  });

  test("toutes les positions sont possibles pour un élément donné", () => {
    const positions = new Set<number>();
    for (let i = 0; i < 400; i += 1) positions.add(melanger([1, 2, 3, 4]).indexOf(1));
    expect(positions.size).toBe(4);
  });
});

describe("resoudreFichierImage", () => {
  test("accepte un chemin de public/memes", () => {
    expect(resoudreFichierImage("/memes/doge.webp")).toBe(
      join(process.cwd(), "public", "/memes/doge.webp"),
    );
    expect(resoudreFichierImage("/memes/ecce-homo-borja.webp")).not.toBeNull();
  });

  test("refuse tout ce qui sort de public/memes ou n'est pas un .webp", () => {
    for (const chemin of [
      "/memes/../../.env",
      "/memes/..%2F..%2F.env",
      "/memes/a/b.webp",
      "/memes/Doge.webp",
      "/memes/doge.png",
      "memes/doge.webp",
      "/autre/doge.webp",
      "/memes/doge.webp\u0000.png",
      "",
    ]) {
      expect(resoudreFichierImage(chemin)).toBeNull();
    }
  });
});

describe("session", () => {
  test("jeton aléatoire et empreinte SHA-256 stable", () => {
    const a = genererJeton();
    const b = genererJeton();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hasherJeton(a)).toBe(hasherJeton(a));
    expect(hasherJeton(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hasherJeton(a)).not.toBe(hasherJeton(b));
    expect(hasherJeton(a)).not.toContain(a);
  });
});

describe("reponseErreurQuestion", () => {
  test("associe chaque erreur à son code HTTP, sans détail interne", async () => {
    const cas = [
      [{ statut: "session_absente" }, 401, "session_absente"],
      [{ statut: "introuvable" }, 404, "introuvable"],
      [{ statut: "conflit", raison: "question_deja_repondue" }, 409, "question_deja_repondue"],
      [{ statut: "pas_assez_de_memes" }, 503, "pas_assez_de_memes"],
    ] as const;
    for (const [erreur, code, nom] of cas) {
      const reponse = reponseErreurQuestion(erreur);
      expect(reponse.status).toBe(code);
      expect(await reponse.json()).toEqual({ erreur: nom });
    }
  });
});
