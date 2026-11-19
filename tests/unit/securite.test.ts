import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

import { ENTETE_CSRF, NOM_COOKIE_CSRF, jetonCsrfValide, lireJetonCsrf } from "@/lib/csrf";
import { politiqueCsp } from "@/lib/entetes-securite";
import { adresseClient, creerLimiteur } from "@/lib/limite-debit";
import { proxy } from "@/proxy";

const JETON = "a".repeat(64);

// Requête vers le proxy ; chaque test prend sa propre adresse IP, les compteurs étant partagés.
function requete(
  chemin: string,
  {
    methode = "POST",
    ip,
    jeton,
    cookie = JETON,
    origine,
  }: {
    methode?: string;
    ip: string;
    jeton?: string;
    cookie?: string | null;
    origine?: string;
  },
) {
  const entetes = new Headers({ host: "localhost:3000", "x-forwarded-for": ip });
  if (jeton !== undefined) entetes.set(ENTETE_CSRF, jeton);
  if (cookie) entetes.set("cookie", `${NOM_COOKIE_CSRF}=${cookie}`);
  if (origine) entetes.set("origin", origine);
  return new NextRequest(`http://localhost:3000${chemin}`, { method: methode, headers: entetes });
}

const laissePasser = (reponse: Response) => reponse.headers.get("x-middleware-next") === "1";

describe("CSRF (SCRUM-70)", () => {
  test("une requête POST sans jeton, ou avec un jeton différent du cookie, est refusée", async () => {
    for (const jeton of [undefined, "", "b".repeat(64)]) {
      const reponse = proxy(requete("/api/parties", { ip: "10.0.0.1", jeton }));
      expect(reponse.status).toBe(403);
      expect(await reponse.json()).toEqual({ erreur: "jeton_csrf_invalide" });
    }
    expect(
      proxy(requete("/api/reponses", { ip: "10.0.0.1", jeton: JETON, cookie: null })).status,
    ).toBe(403);
  });

  test("le jeton identique au cookie passe ; les lectures n'en ont pas besoin", () => {
    expect(laissePasser(proxy(requete("/api/parties", { ip: "10.0.0.2", jeton: JETON })))).toBe(
      true,
    );
    expect(laissePasser(proxy(requete("/api/stats", { methode: "GET", ip: "10.0.0.2" })))).toBe(
      true,
    );
  });

  test("une requête mutante venant d'un autre site est refusée, même avec le jeton", () => {
    const reponse = proxy(
      requete("/api/parties", { ip: "10.0.0.3", jeton: JETON, origine: "https://pirate.example" }),
    );
    expect(reponse.status).toBe(403);
  });

  test("la tâche planifiée (secret Bearer, sans navigateur) n'a pas besoin du jeton", () => {
    const reponse = proxy(requete("/api/push/quiz-du-jour", { ip: "10.0.0.4", cookie: null }));
    expect(laissePasser(reponse)).toBe(true);
  });

  test("la première page visitée pose le cookie du jeton", () => {
    const reponse = proxy(requete("/", { methode: "GET", ip: "10.0.0.5", cookie: null }));
    expect(reponse.cookies.get(NOM_COOKIE_CSRF)?.value).toMatch(/^[0-9a-f]{64}$/);
    expect(reponse.cookies.get(NOM_COOKIE_CSRF)?.sameSite).toBe("strict");
  });

  test("lecture du jeton dans document.cookie et comparaison", () => {
    expect(lireJetonCsrf(`autre=1; ${NOM_COOKIE_CSRF}=abc; x=2`)).toBe("abc");
    expect(lireJetonCsrf("autre=1")).toBeNull();
    expect(jetonCsrfValide("abc", "abc")).toBe(true);
    expect(jetonCsrfValide("abc", "abd")).toBe(false);
    expect(jetonCsrfValide("abc", "abcd")).toBe(false);
  });
});

describe("limitation de débit (SCRUM-72)", () => {
  test("un abus simulé est bloqué par le proxy (429 et Retry-After)", () => {
    const envoyer = () => proxy(requete("/api/parties", { ip: "10.0.1.1", jeton: JETON }));
    for (let i = 0; i < 60; i += 1) expect(envoyer().status).not.toBe(429);
    const bloquee = envoyer();
    expect(bloquee.status).toBe(429);
    expect(Number(bloquee.headers.get("retry-after"))).toBeGreaterThan(0);
    // Une autre adresse n'est pas pénalisée.
    expect(proxy(requete("/api/parties", { ip: "10.0.1.2", jeton: JETON })).status).not.toBe(429);
  });

  test("la connexion admin (action serveur) est freinée contre la force brute", () => {
    const tenter = () => proxy(requete("/admin", { ip: "10.0.1.3", cookie: null }));
    for (let i = 0; i < 20; i += 1) expect(tenter().status).not.toBe(429);
    expect(tenter().status).toBe(429);
  });

  test("le compteur repart à zéro à la fenêtre suivante", () => {
    const limiteur = creerLimiteur({ max: 2, fenetreMs: 1000 });
    expect(limiteur.consommer("ip", 0).autorise).toBe(true);
    expect(limiteur.consommer("ip", 10).autorise).toBe(true);
    expect(limiteur.consommer("ip", 20)).toEqual({ autorise: false, reessayerApresS: 1 });
    expect(limiteur.consommer("ip", 1000).autorise).toBe(true);
  });

  test("la mémoire reste bornée face à un flot d'adresses différentes", () => {
    const limiteur = creerLimiteur({ max: 1, fenetreMs: 60_000, clesMax: 3 });
    for (const ip of ["a", "b", "c", "d", "e"])
      expect(limiteur.consommer(ip, 0).autorise).toBe(true);
  });

  test("l'adresse retenue est celle ajoutée par Caddy, pas celle inventée par le client", () => {
    expect(adresseClient(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("5.6.7.8");
    expect(adresseClient(new Headers())).toBe("inconnue");
  });
});

describe("Content Security Policy (SCRUM-68)", () => {
  test("en production : ni eval, ni origine externe, ni cadre, ni plugin", () => {
    const csp = politiqueCsp(false);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/https?:/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});
