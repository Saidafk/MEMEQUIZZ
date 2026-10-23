import { createHash, randomBytes } from "node:crypto";

// Session anonyme : un jeton aléatoire dans un cookie httpOnly ; seule son empreinte SHA-256
// est stockée en base (joueur.token_session_hash). Un jeton de 256 bits n'a pas besoin de sel.
// Le jeton est créé au démarrage de la partie (SCRUM-42) ; les routes ne font que le vérifier.
export const NOM_COOKIE_SESSION = "memequizz_session";

export function genererJeton(): string {
  return randomBytes(32).toString("base64url");
}

export function hasherJeton(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

export const DUREE_COOKIE_S = 2 * 60 * 60;

// HttpOnly : illisible par le JavaScript de la page (un XSS ne vole pas la session).
// SameSite=Strict : jamais envoyé depuis un autre site (protection CSRF avec le Content-Type JSON).
// Secure : en production seulement, derrière HTTPS (le développement se fait en http://localhost).
export function cookieSession(jeton: string, securise: boolean): string {
  return [
    `${NOM_COOKIE_SESSION}=${jeton}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${DUREE_COOKIE_S}`,
    ...(securise ? ["Secure"] : []),
  ].join("; ");
}
