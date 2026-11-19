import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "./axe";

const QUESTIONS = 10;

// Multijoueur (SCRUM-86) : deux joueurs, chacun dans son propre contexte de navigateur (cookies et
// session séparés), jouent une salle complète. Vérifie l'arrivée en direct dans la salle d'attente,
// le classement mis à jour sans recharger (SSE, SCRUM-84) et la question suivante ouverte pour tous.
// Écrit en base : à lancer sur une base locale ou de CI.
test("deux joueurs jouent une salle complète avec le classement en direct", async ({ browser }) => {
  test.setTimeout(180_000);
  const suffixe = Date.now().toString(36);
  const pseudoHote = `hote-${suffixe}`;
  const pseudoInvite = `invite-${suffixe}`;

  const contexteHote = await browser.newContext();
  const contexteInvite = await browser.newContext();
  const hote = await contexteHote.newPage();
  const invite = await contexteInvite.newPage();
  const violationsCsp: string[] = [];
  for (const page of [hote, invite]) {
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) violationsCsp.push(message.text());
    });
  }

  // L'hôte crée la salle et obtient le code.
  await hote.goto("/salle");
  await verifierAccessibilite(hote, "salle : créer ou rejoindre");
  const creer = hote.getByRole("region", { name: "Créer une salle" });
  await creer.getByLabel("Ton pseudo").fill(pseudoHote);
  await creer.getByRole("button", { name: "Créer une salle →" }).click();
  await expect(hote).toHaveURL(/\/salle\/[A-Z2-9]{6}$/);
  await expect(hote.getByRole("heading", { name: "Salle d'attente" })).toBeVisible();
  const code = new URL(hote.url()).pathname.split("/").at(-1) ?? "";

  // L'invité rejoint avec le code (saisi en minuscules : la saisie est normalisée).
  await invite.goto("/salle");
  const rejoindre = invite.getByRole("region", { name: "Rejoindre une salle" });
  await rejoindre.getByLabel("Code de la salle").fill(code.toLowerCase());
  await rejoindre.getByLabel("Ton pseudo").fill(pseudoInvite);
  await rejoindre.getByRole("button", { name: "Rejoindre la salle →" }).click();
  await expect(invite).toHaveURL(new RegExp(`/salle/${code}$`));
  await expect(invite.getByText("En attente du lancement par l'hôte…")).toBeVisible();

  // L'hôte voit l'invité arriver sans recharger la page.
  await expect(hote.getByText("2 joueurs dans la salle")).toBeVisible();
  await expect(hote.getByRole("listitem").filter({ hasText: pseudoInvite })).toBeVisible();
  await verifierAccessibilite(hote, "salle d'attente");

  await hote.getByRole("button", { name: "Lancer la partie →" }).click();

  const ligne = (page: Page, pseudo: string) =>
    page.getByRole("listitem").filter({ hasText: pseudo });

  for (let rang = 1; rang <= QUESTIONS; rang += 1) {
    for (const page of [hote, invite]) {
      await expect(page.getByRole("heading", { name: "C'est quel mème ?" })).toBeVisible();
      await expect(page.getByText(`Question ${rang} / ${QUESTIONS}`)).toBeVisible();
    }
    if (rang === 1) await verifierAccessibilite(hote, "question en salle");

    await hote.getByRole("button", { name: /^A\./ }).click();
    await expect(hote.getByRole("heading", { name: "C'était…" })).toBeVisible();
    if (rang === 1) {
      // Classement en direct : l'invité voit que l'hôte a répondu, sans recharger. L'hôte, lui,
      // attend l'invité avant la question suivante.
      await expect(ligne(invite, pseudoHote)).toContainText("a répondu");
      await expect(
        hote.getByRole("button", { name: "En attente des autres joueurs…" }),
      ).toBeVisible();
      await verifierAccessibilite(hote, "correction en salle");
    }

    await invite.getByRole("button", { name: /^B\./ }).click();
    await expect(invite.getByRole("heading", { name: "C'était…" })).toBeVisible();

    // Après la dernière question, la salle se termine dès que tout le monde a répondu : l'écran de
    // fin remplace la question tout seul (flux SSE). Cliquer « Voir le classement de la salle »
    // serait une course perdue d'avance, le bouton disparaissant pendant le clic.
    if (rang < QUESTIONS) {
      for (const page of [hote, invite]) {
        await page.getByRole("button", { name: "Question suivante →" }).click();
      }
    }
  }

  // Fin de salle : même classement final pour les deux joueurs.
  for (const page of [hote, invite]) {
    await expect(page.getByRole("heading", { name: "Partie terminée !" })).toBeVisible();
    await expect(ligne(page, pseudoHote)).toBeVisible();
    await expect(ligne(page, pseudoInvite)).toBeVisible();
  }
  await verifierAccessibilite(invite, "classement de la salle");
  expect(violationsCsp).toEqual([]);

  await contexteHote.close();
  await contexteInvite.close();
});

test("un code de salle inconnu est refusé avec un message", async ({ page }) => {
  await page.goto("/salle");
  const rejoindre = page.getByRole("region", { name: "Rejoindre une salle" });
  await rejoindre.getByLabel("Code de la salle").fill("ZZZZZZ");
  await rejoindre.getByLabel("Ton pseudo").fill("perdu");
  await rejoindre.getByRole("button", { name: "Rejoindre la salle →" }).click();
  await expect(rejoindre.getByRole("alert")).toContainText("Aucune salle avec ce code");
  await expect(rejoindre.getByLabel("Code de la salle")).toBeFocused();
  await expect(page).toHaveURL(/\/salle$/);
});
