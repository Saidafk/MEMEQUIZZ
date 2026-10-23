import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FicheMeme } from "@/components/FicheMeme";
import { MEMES } from "@/db/data/memes";

// Mèmes sans aucun article Wikipédia (ni FR ni EN) : exception documentée dans docs/selection-memes.md.
const SANS_ARTICLE = ["awesome-face"];

describe("fiches des mèmes (SCRUM-38)", () => {
  test("chaque fiche a un article Wikipédia en https, sauf l'exception listée", () => {
    for (const m of MEMES) {
      if (SANS_ARTICLE.includes(m.slug)) {
        expect(m.article_url).toBeNull();
        expect(m.origine).toBeNull();
        continue;
      }
      expect(m.article_url).not.toBeNull();
      const url = new URL(m.article_url as string);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toMatch(/^(fr|en)\.wikipedia\.org$/);
      expect(m.article_url?.length).toBeLessThanOrEqual(500);
    }
  });

  test("une fiche avec un article a une origine reformulée de 500 caractères au plus", () => {
    for (const m of MEMES.filter((f) => f.article_url !== null)) {
      expect(m.origine?.trim().length ?? 0).toBeGreaterThan(40);
      expect(m.origine?.length).toBeLessThanOrEqual(500);
    }
  });

  test("l'année, quand elle existe, est plausible", () => {
    for (const m of MEMES) {
      if (m.annee_origine !== null) {
        expect(m.annee_origine).toBeGreaterThanOrEqual(1990);
        expect(m.annee_origine).toBeLessThanOrEqual(new Date().getFullYear());
      }
    }
  });

  test("moins d'une fiche sur deux repose sur un article en anglais", () => {
    const anglais = MEMES.filter((m) => m.article_url?.startsWith("https://en."));
    expect(anglais.length).toBeLessThan(MEMES.length / 2);
  });
});

describe("FicheMeme : lien vers l'article", () => {
  const fiche = { nom: "Doge", origine: "Origine", description: "", source: "" };
  const rendu = (articleUrl: string | null | undefined) =>
    renderToStaticMarkup(createElement(FicheMeme, { fiche, articleUrl }));

  test("article français : lien « Wikipédia » qui s'ouvre dans un nouvel onglet annoncé", () => {
    const html = rendu("https://fr.wikipedia.org/wiki/Doge_(m%C3%A8me)");
    expect(html).toContain('href="https://fr.wikipedia.org/wiki/Doge_(m%C3%A8me)"');
    expect(html).toContain("Wikipédia");
    expect(html).not.toContain("en anglais");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("nouvel onglet");
  });

  test("article anglais : la langue est indiquée", () => {
    expect(rendu("https://en.wikipedia.org/wiki/Rage_comic")).toContain("Wikipédia (en anglais)");
  });

  test("aucun lien pour une adresse absente, non https ou hors Wikipédia", () => {
    for (const url of [
      null,
      undefined,
      "",
      "javascript:alert(1)",
      "http://fr.wikipedia.org/wiki/X",
      "https://exemple.fr/wiki/X",
      "https://wikipedia.org.evil.fr/wiki/X",
      "pas une adresse",
    ]) {
      const html = rendu(url);
      expect(html).not.toContain("<a ");
      expect(html).not.toContain("En savoir plus");
    }
  });
});
