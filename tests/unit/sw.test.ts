import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Exécute public/sw.js avec un faux contexte de service worker et simule des requêtes `fetch`.
function chargerServiceWorker() {
  const gestionnaires: Record<string, (evenement: unknown) => void> = {};
  const faux = {
    location: { origin: "https://exemple.test" },
    addEventListener: (type: string, fonction: (e: unknown) => void) => {
      gestionnaires[type] = fonction;
    },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };
  const cache = { match: async () => undefined, put: async () => {}, add: async () => {} };
  const caches = { open: async () => cache, keys: async () => [], delete: async () => true };
  const reseau = async () => ({ ok: false, clone: () => ({}) });
  new Function("self", "caches", "fetch", readFileSync("public/sw.js", "utf8"))(
    faux,
    caches,
    reseau,
  );
  return gestionnaires;
}

// Renvoie vrai si le service worker prend la requête en charge (il appelle respondWith).
function intercepte(chemin: string, options: { methode?: string; mode?: string } = {}): boolean {
  const { fetch: surFetch } = chargerServiceWorker();
  let pris = false;
  surFetch!({
    request: {
      method: options.methode ?? "GET",
      url: `https://exemple.test${chemin}`,
      mode: options.mode ?? "navigate",
    },
    respondWith: () => {
      pris = true;
    },
    waitUntil: () => {},
  });
  return pris;
}

describe("service worker : ce qui n'est jamais mis en cache", () => {
  test("l'administration n'est jamais interceptée", () => {
    expect(intercepte("/admin")).toBe(false);
    expect(intercepte("/admin/12")).toBe(false);
    expect(intercepte("/admin/nouveau")).toBe(false);
  });

  test("les routes de l'API (sauf le lot d'entraînement) et les envois ne le sont pas", () => {
    expect(intercepte("/api/parties", { mode: "cors" })).toBe(false);
    expect(intercepte("/api/reponses", { methode: "POST", mode: "cors" })).toBe(false);
    expect(intercepte("/api/push/abonnements", { methode: "POST", mode: "cors" })).toBe(false);
    expect(intercepte("/api/entrainement", { mode: "cors" })).toBe(true);
  });

  test("les pages publiques et les images le sont", () => {
    expect(intercepte("/")).toBe(true);
    expect(intercepte("/classement")).toBe(true);
    expect(intercepte("/memes/doge.webp", { mode: "no-cors" })).toBe(true);
  });
});
