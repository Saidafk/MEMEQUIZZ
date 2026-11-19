import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "./axe";

const QUESTIONS = 10;

// Parcours complet d'un joueur (SCRUM-62) : accueil → 10 questions → résultat → classement, avec
// axe à chaque écran du jeu (SCRUM-63). Écrit en base : à lancer sur une base locale ou de CI.
test("une partie complète va de l'accueil au classement", async ({ page }) => {
  // Pseudo unique (20 caractères au plus) pour retrouver le joueur dans le classement.
  const pseudo = `e2e-${Date.now().toString(36)}`;
  // CSP (SCRUM-68) : aucune violation signalée dans la console sur tout le parcours.
  const violationsCsp: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violationsCsp.push(message.text());
  });

  await page.goto("/");
  await verifierAccessibilite(page, "accueil");
  await page.getByLabel("Ton pseudo").fill(pseudo);
  await page.getByRole("button", { name: "C'est parti →" }).click();
  await expect(page).toHaveURL(/\/jeu\/\d+$/);

  for (let rang = 1; rang <= QUESTIONS; rang += 1) {
    await expect(page.getByRole("heading", { name: "C'est quel mème ?" })).toBeVisible();
    await expect(page.getByText(`Question ${rang} / ${QUESTIONS}`)).toBeVisible();

    if (rang === 1) {
      // Anti-triche : avant la réponse, l'alt de l'image ne nomme pas le mème.
      await expect(page.getByRole("img", { name: "Image d'un mème à identifier" })).toBeVisible();
      await verifierAccessibilite(page, "question");
    }

    await page.getByRole("button", { name: /^A\./ }).click();

    // La correction vient du serveur : la bonne réponse est toujours signalée, que A soit juste ou non.
    await expect(page.getByRole("heading", { name: "C'était…" })).toBeVisible();
    await expect(page.getByRole("button", { name: /bonne réponse/ })).toHaveCount(1);
    if (rang === 1) await verifierAccessibilite(page, "correction");

    const suite = rang < QUESTIONS ? "Question suivante →" : "Voir mon résultat →";
    await page.getByRole("button", { name: suite }).click();
  }

  await expect(page).toHaveURL(/\/resultat\/\d+$/);
  await expect(page.getByRole("heading", { name: "Partie terminée !" })).toBeVisible();
  await verifierAccessibilite(page, "résultat");

  await page.getByRole("link", { name: "Voir le classement" }).click();
  await expect(page).toHaveURL(/\/classement$/);
  await expect(page.getByRole("heading", { name: "Classement", level: 1 })).toBeVisible();
  // Partie terminée aujourd'hui : le joueur figure dans le classement du jour.
  await expect(page.getByText(pseudo)).toBeVisible();
  await verifierAccessibilite(page, "classement");
  expect(violationsCsp).toEqual([]);
});

test("un pseudo vide est refusé sans quitter l'accueil", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "C'est parti →" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "✗" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Ton pseudo")).toBeFocused();
});
