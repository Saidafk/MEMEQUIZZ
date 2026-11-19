import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "./axe";

// axe sur les pages publiques hors partie (SCRUM-63). Les écrans du jeu sont vérifiés dans
// partie.e2e.ts, au fil du parcours. Lecture seule : aucune de ces pages n'écrit en base.
const PAGES = [
  "/classement?periode=toujours",
  "/entrainement",
  "/stats",
  "/meme/doge",
  "/credits",
  "/hors-ligne",
];

for (const chemin of PAGES) {
  test(`aucune violation axe bloquante sur ${chemin}`, async ({ page }) => {
    const reponse = await page.goto(chemin);
    expect(reponse?.status()).toBe(200);
    await verifierAccessibilite(page, chemin);
  });
}
