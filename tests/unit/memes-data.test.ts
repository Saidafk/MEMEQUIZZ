import { describe, expect, test } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { MEMES } from "@/db/data/memes";
import { LICENCES_LIBRES } from "@/db/schema";

describe("liste des mèmes (skill meme-data)", () => {
  test("contient au moins 10 mèmes", () => {
    expect(MEMES.length).toBeGreaterThanOrEqual(10);
  });

  test("slugs et noms sont uniques, slugs en kebab-case", () => {
    const slugs = MEMES.map((m) => m.slug);
    const noms = MEMES.map((m) => m.nom.toLowerCase());
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(noms).size).toBe(noms.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test("chaque fiche a une licence libre, un auteur et une source Commons", () => {
    for (const m of MEMES) {
      expect(LICENCES_LIBRES).toContain(m.licence);
      expect(m.auteur.trim()).not.toBe("");
      expect(m.source_url).toStartWith("https://commons.wikimedia.org/wiki/File:");
    }
  });

  test("respecte les longueurs de colonnes de la table meme", () => {
    for (const m of MEMES) {
      expect(m.slug.length).toBeLessThanOrEqual(80);
      expect(m.nom.length).toBeLessThanOrEqual(120);
      expect(m.auteur.length).toBeLessThanOrEqual(200);
      expect(m.source_url.length).toBeLessThanOrEqual(500);
      expect((m.origine ?? "").length).toBeLessThanOrEqual(500);
      expect(`/memes/${m.slug}.webp`.length).toBeLessThanOrEqual(200);
    }
  });

  test("chaque mème a son image WebP locale de 100 Ko maximum", () => {
    for (const m of MEMES) {
      const chemin = join(process.cwd(), "public", "memes", `${m.slug}.webp`);
      expect(existsSync(chemin)).toBe(true);
      expect(statSync(chemin).size).toBeLessThanOrEqual(100 * 1024);
    }
  });
});
