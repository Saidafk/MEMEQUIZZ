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
