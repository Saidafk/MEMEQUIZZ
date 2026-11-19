import { expect, test } from "@playwright/test";

// Sécurité vue du navigateur (SCRUM-68 à 70) : en-têtes réellement servis, jeton CSRF exigé par
// l'API, pseudo piégé refusé par le serveur même quand on contourne le contrôle du formulaire.
test("l'API exige le jeton CSRF et refuse un pseudo piégé", async ({ page, context }) => {
  const accueil = await page.goto("/");
  const entetes = accueil?.headers() ?? {};
  expect(entetes["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(entetes["x-content-type-options"]).toBe("nosniff");

  // Cookie de session du navigateur envoyé, mais pas l'en-tête : refusé.
  const sansJeton = await page.request.post("/api/parties", { data: { pseudo: "e2e-csrf" } });
  expect(sansJeton.status()).toBe(403);

  const jeton = (await context.cookies()).find((c) => c.name === "memequizz_csrf")?.value;
  expect(jeton).toBeTruthy();

  const piege = await page.request.post("/api/parties", {
    data: { pseudo: "<img src=x onerror=alert(1)>" },
    headers: { "x-csrf-token": jeton ?? "" },
  });
  expect(piege.status()).toBe(400);
});

// Onglet ouvert avant un déploiement, ou cookie effacé : le joueur est invité à recharger la page
// au lieu de lire « jeu indisponible » (SCRUM-112).
test("sans jeton CSRF, le formulaire demande de recharger la page", async ({ page, context }) => {
  await page.goto("/");
  await context.clearCookies({ name: "memequizz_csrf" });
  await page.getByLabel("Ton pseudo").fill("e2e-jeton");
  await page.getByRole("button", { name: "C'est parti →" }).click();
  await expect(page.getByText("Recharge la page pour continuer.")).toBeVisible();
});
