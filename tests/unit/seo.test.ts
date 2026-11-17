import { describe, expect, test } from "bun:test";

import {
  CHEMINS_INTERDITS,
  PAGES_PUBLIQUES,
  URL_SITE,
  construireRobots,
  construireSitemap,
  metadonneesPage,
} from "@/lib/seo";

describe("sitemap (SCRUM-55)", () => {
  test("liste les pages publiques puis une page par mème, en adresses absolues", () => {
    const urls = construireSitemap(["doge", "nyan-cat"]).map((e) => e.url);
    expect(urls).toHaveLength(PAGES_PUBLIQUES.length + 2);
    expect(urls[0]).toBe(URL_SITE);
    expect(urls).toContain(`${URL_SITE}/classement`);
    expect(urls.at(-1)).toBe(`${URL_SITE}/meme/nyan-cat`);
    expect(urls.every((u) => u.startsWith("https://"))).toBe(true);
  });

  test("n'a aucun doublon et aucune page non indexable", () => {
    const urls = construireSitemap(["doge"]).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    // Pages noindex : celles de robots.txt, plus celles qui y sont accessibles mais non indexées.
    for (const interdit of [...CHEMINS_INTERDITS, "/entrainement", "/hors-ligne"]) {
      expect(urls.some((u) => u.startsWith(`${URL_SITE}${interdit}`))).toBe(false);
    }
  });
});

describe("robots.txt (SCRUM-55)", () => {
  test("autorise le site, interdit le backoffice et les parties, annonce le sitemap", () => {
    const r = construireRobots();
    expect(r.sitemap).toBe(`${URL_SITE}/sitemap.xml`);
    expect(r.rules).toMatchObject({ userAgent: "*", allow: "/" });
    for (const chemin of ["/admin", "/api/", "/jeu/", "/resultat/"]) {
      expect(CHEMINS_INTERDITS).toContain(chemin);
    }
  });
});

describe("métadonnées d'une page (SCRUM-55)", () => {
  test("renseigne titre, description, canonical, Open Graph et Twitter", () => {
    const m = metadonneesPage({
      titre: "Classement — MEMEQUIZZ",
      description: "Les meilleurs scores.",
      chemin: "/classement",
    });
    expect(m.title).toBe("Classement — MEMEQUIZZ");
    expect(m.description).toBe("Les meilleurs scores.");
    expect(m.alternates?.canonical).toBe("/classement");
    expect(m.openGraph).toMatchObject({
      url: "/classement",
      locale: "fr_FR",
      siteName: "MEMEQUIZZ",
    });
    expect(m.twitter).toMatchObject({ title: "Classement — MEMEQUIZZ" });
  });

  test("utilise l'image fournie pour le partage", () => {
    const m = metadonneesPage({
      titre: "t",
      description: "d",
      chemin: "/x",
      image: "/memes/a.webp",
    });
    expect(m.openGraph?.images).toEqual([{ url: "/memes/a.webp" }]);
  });
});
