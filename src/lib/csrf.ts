// Protection CSRF des routes API (SCRUM-70), par double soumission d'un jeton :
// - le proxy pose un cookie `memequizz_csrf` (aléatoire, SameSite=Strict) à la première page visitée ;
// - le navigateur le recopie dans l'en-tête `x-csrf-token` de chaque requête POST/DELETE ;
// - le proxy refuse (403) toute requête mutante dont l'en-tête manque ou diffère du cookie.
// Un autre site ne peut ni lire ce cookie ni poser cet en-tête sans demande d'autorisation préalable
// (CORS) : il ne peut donc pas forger la requête. Ce module est partagé par le proxy et le client :
// aucune dépendance Node.
export const NOM_COOKIE_CSRF = "memequizz_csrf";
export const ENTETE_CSRF = "x-csrf-token";

export function genererJetonCsrf(): string {
  const octets = new Uint8Array(32);
  crypto.getRandomValues(octets);
  return Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
}

// Comparaison en temps constant : la durée ne dit pas combien de caractères sont justes.
export function jetonCsrfValide(
  cookie: string | null | undefined,
  entete: string | null | undefined,
): boolean {
  if (!cookie || !entete || cookie.length !== entete.length) return false;
  let difference = 0;
  for (let i = 0; i < cookie.length; i += 1) {
    difference |= cookie.charCodeAt(i) ^ entete.charCodeAt(i);
  }
  return difference === 0;
}

export function lireJetonCsrf(cookies: string): string | null {
  for (const morceau of cookies.split(";")) {
    const [nom, ...valeur] = morceau.trim().split("=");
    if (nom === NOM_COOKIE_CSRF) return valeur.join("=") || null;
  }
  return null;
}

// En-têtes des appels `fetch` mutants du client : JSON + jeton CSRF lu dans le cookie.
export function entetesJsonCsrf(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    [ENTETE_CSRF]: lireJetonCsrf(document.cookie) ?? "",
  };
}

// Réponse 403 du proxy : jeton absent ou périmé. Cas typique : un onglet ouvert avant un déploiement
// (ancien JavaScript, sans l'en-tête). Recharger la page pose le cookie et charge le nouveau code.
export const MESSAGE_JETON_CSRF =
  "Ta session a expiré (le site vient sans doute d'être mis à jour). Recharge la page pour continuer.";
