import { createHmac, timingSafeEqual } from "node:crypto";

// Authentification de l'administrateur du backoffice (SCRUM-96) : un mot de passe unique
// (ADMIN_PASSWORD, variable d'environnement), sans compte joueur. La session est un cookie signé
// (HMAC) avec une date d'expiration ; changer le mot de passe invalide toutes les sessions.
export const NOM_COOKIE_ADMIN = "memequizz_admin";
export const DUREE_SESSION_ADMIN_S = 60 * 60 * 8;

function cleSignature(motDePasse: string): string {
  return createHmac("sha256", "memequizz-admin-v1").update(motDePasse).digest("hex");
}

function signer(expiration: number, motDePasse: string): string {
  return createHmac("sha256", cleSignature(motDePasse)).update(String(expiration)).digest("hex");
}

export function egalTempsConstant(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function motDePasseValide(saisi: string, attendu: string | undefined): boolean {
  if (!attendu || attendu.length < 12) return false;
  return egalTempsConstant(saisi, attendu);
}

export function creerJetonAdmin(motDePasse: string, maintenantMs = Date.now()): string {
  const expiration = Math.floor(maintenantMs / 1000) + DUREE_SESSION_ADMIN_S;
  return `${expiration}.${signer(expiration, motDePasse)}`;
}

export function jetonAdminValide(
  jeton: string | undefined,
  motDePasse: string | undefined,
  maintenantMs = Date.now(),
): boolean {
  if (!jeton || !motDePasse || motDePasse.length < 12) return false;
  const [exp, signature, reste] = jeton.split(".");
  if (!exp || !signature || reste !== undefined || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Math.floor(maintenantMs / 1000)) return false;
  return egalTempsConstant(signature, signer(Number(exp), motDePasse));
}
