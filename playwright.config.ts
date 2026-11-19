import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout (SCRUM-62) et d'accessibilité avec axe (SCRUM-63).
// Suffixe `.e2e.ts` et non `.spec.ts` : `bun test` ramasse les `*.spec.ts`, il lancerait ces fichiers
// sans Playwright.
//
// Par défaut, Playwright démarre le build de production (`bun run start`, donc `bun run build` avant)
// sur une base préparée (migrations + seed). E2E_BASE_URL permet de viser un serveur déjà lancé, par
// exemple `bun run dev` : on ne vise jamais la production, la partie écrit en base.
const urlExterne = process.env.E2E_BASE_URL;
const enCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: enCI,
  // Un seul nouvel essai en CI : un échec qui ne se reproduit pas est signalé « flaky » dans le
  // rapport, il ne passe pas inaperçu.
  retries: enCI ? 1 : 0,
  reporter: enCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: urlExterne ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: urlExterne
    ? undefined
    : {
        command: "bun run start",
        url: "http://localhost:3000",
        reuseExistingServer: !enCI,
        timeout: 60_000,
      },
});
