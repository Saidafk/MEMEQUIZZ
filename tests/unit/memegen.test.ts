import { describe, expect, test } from "bun:test";

import { genererSql, ligneImport, slugMemegen, slugsUniques } from "@/lib/memegen";

describe("slugMemegen", () => {
  test("préfixe et normalise l'identifiant", () => {
    expect(slugMemegen("3hd")).toBe("memegen-3hd");
    expect(slugMemegen("Spider_Man.2")).toBe("memegen-spider-man-2");
  });

  test("respecte la forme des fichiers servis par /memes", () => {
    for (const id of ["a", "ds", "x--y", "é", "___", "a".repeat(200)]) {
      const slug = slugMemegen(id);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slug.length).toBeLessThanOrEqual(80);
    }
  });
});

describe("slugsUniques", () => {
  test("deux identifiants au même slug normalisé reçoivent un suffixe", () => {
    const m = (id: string) => ({ id, name: id, blank: "https://x/x.jpg" });
    expect(slugsUniques([m("a-b"), m("a_b"), m("a.b"), m("c")])).toEqual([
      "memegen-a-b",
      "memegen-a-b-2",
      "memegen-a-b-3",
      "memegen-c",
    ]);
  });
});

describe("ligneImport", () => {
  const modele = { id: "3hd", name: "Three-Headed Dragon", blank: "https://x/3hd.jpg" };

  test("marque toujours la licence comme non vérifiée", () => {
    expect(ligneImport(modele).licence).toBe("non_verifiee");
    expect(ligneImport({ ...modele, source: "https://knowyourmeme.com/x" }).licence).toBe(
      "non_verifiee",
    );
  });

  test("garde une source https, ignore les autres", () => {
    expect(ligneImport({ ...modele, source: "https://knowyourmeme.com/x" }).source_url).toBe(
      "https://knowyourmeme.com/x",
    );
    expect(ligneImport({ ...modele, source: "http://exemple.com" }).source_url).toBe("");
    expect(ligneImport({ ...modele, source: "javascript:alert(1)" }).source_url).toBe("");
    expect(ligneImport({ ...modele, source: null }).source_url).toBe("");
  });

  test("chemin d'image cohérent avec le slug et nom borné", () => {
    const l = ligneImport({ ...modele, name: "N".repeat(300) });
    expect(l.image_chemin).toBe("/memes/memegen-3hd.webp");
    expect(l.nom).toHaveLength(120);
  });
});

describe("genererSql", () => {
  test("double les apostrophes (pas d'injection par un nom)", () => {
    const sql = genererSql([
      ligneImport({ id: "x", name: "L'été'); DROP TABLE meme;--", blank: "https://x/x.jpg" }),
    ]);
    expect(sql).toContain("'L''été''); DROP TABLE meme;--'");
  });

  test("upsert sans toucher à `actif`, et vide si aucune ligne", () => {
    const sql = genererSql([ligneImport({ id: "x", name: "X", blank: "https://x/x.jpg" })]);
    expect(sql).toContain("ON CONFLICT (slug) DO UPDATE");
    expect(sql.split("DO UPDATE")[1]).not.toContain("actif");
    expect(genererSql([])).toBe("");
  });
});
