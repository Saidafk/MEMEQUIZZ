import { describe, expect, test } from "bun:test";

import { composerQuestions, type MemeEntrainement } from "@/lib/entrainement";

const memes: MemeEntrainement[] = Array.from({ length: 12 }, (_, i) => ({
  id_meme: i + 1,
  nom: `Mème ${i + 1}`,
  image_chemin: `/memes/meme-${i + 1}.webp`,
  annee_origine: 2010,
  origine: null,
  auteur: "Auteur",
  licence: "cc0",
  source_url: "https://commons.wikimedia.org/",
  article_url: null,
}));

describe("composerQuestions", () => {
  test("produit le nombre demandé de questions à 4 choix distincts contenant la bonne réponse", () => {
    const questions = composerQuestions(memes, 10);
    expect(questions).toHaveLength(10);
    for (const q of questions) {
      const ids = q.choix.map((c) => c.id_meme);
      expect(new Set(ids).size).toBe(4);
      expect(ids).toContain(q.bonne.id_meme);
    }
  });

  test("ne répète pas un même mème comme bonne réponse", () => {
    const bonnes = composerQuestions(memes, 10).map((q) => q.bonne.id_meme);
    expect(new Set(bonnes).size).toBe(bonnes.length);
  });

  test("renvoie une image publique de /memes", () => {
    for (const q of composerQuestions(memes, 3)) expect(q.image_url).toMatch(/^\/memes\//);
  });

  test("ne produit rien s'il y a moins de 4 mèmes", () => {
    expect(composerQuestions(memes.slice(0, 3))).toEqual([]);
  });
});
