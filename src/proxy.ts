import { NextResponse, type NextRequest } from "next/server";

import { ENTETE_CSRF, NOM_COOKIE_CSRF, genererJetonCsrf, jetonCsrfValide } from "@/lib/csrf";
import { adresseClient, creerLimiteur } from "@/lib/limite-debit";

// Proxy (ex-middleware) : limitation de débit de l'API (SCRUM-72) et protection CSRF (SCRUM-70).
// Les en-têtes de sécurité et la CSP sont posés par next.config.ts.

// Une partie complète fait une trentaine de requêtes API (questions, images, réponses) dont 11
// écritures : ces seuils laissent jouer plusieurs parties par minute et arrêtent un script.
const limiteurApi = creerLimiteur({ max: 300, fenetreMs: 60_000 });
const limiteurEcritures = creerLimiteur({ max: 60, fenetreMs: 60_000 });
// Actions serveur (backoffice, dont la connexion admin) : freine la recherche du mot de passe par force brute.
const limiteurActions = creerLimiteur({ max: 20, fenetreMs: 60_000 });

// Appelée par la tâche planifiée du serveur, protégée par un secret (pas de navigateur, pas de cookie).
const SANS_JETON_CSRF = new Set(["/api/push/quiz-du-jour"]);

const METHODES_SURES = new Set(["GET", "HEAD", "OPTIONS"]);

function refus(statut: number, erreur: string, entetes?: Record<string, string>) {
  return NextResponse.json({ erreur }, { status: statut, headers: entetes });
}

// Une requête mutante qui annonce une origine doit venir de ce site (défense en plus du jeton,
// valable aussi pour les actions serveur de l'admin).
function origineAutorisee(requete: NextRequest): boolean {
  const origine = requete.headers.get("origin");
  if (!origine) return true;
  const hote = requete.headers.get("x-forwarded-host") ?? requete.headers.get("host");
  try {
    return new URL(origine).host === hote;
  } catch {
    return false;
  }
}

export function proxy(requete: NextRequest) {
  const { pathname } = requete.nextUrl;
  const mutante = !METHODES_SURES.has(requete.method);

  if (mutante && !origineAutorisee(requete)) return refus(403, "origine_refusee");

  if (mutante && !pathname.startsWith("/api/")) {
    const verdict = limiteurActions.consommer(adresseClient(requete.headers));
    if (!verdict.autorise) {
      return refus(429, "trop_de_requetes", { "Retry-After": String(verdict.reessayerApresS) });
    }
  }

  if (pathname.startsWith("/api/")) {
    const ip = adresseClient(requete.headers);
    const verdict = limiteurApi.consommer(ip);
    const verdictEcriture = mutante ? limiteurEcritures.consommer(ip) : verdict;
    for (const v of [verdict, verdictEcriture]) {
      if (!v.autorise) {
        return refus(429, "trop_de_requetes", { "Retry-After": String(v.reessayerApresS) });
      }
    }

    if (
      mutante &&
      !SANS_JETON_CSRF.has(pathname) &&
      !jetonCsrfValide(
        requete.cookies.get(NOM_COOKIE_CSRF)?.value,
        requete.headers.get(ENTETE_CSRF),
      )
    ) {
      return refus(403, "jeton_csrf_invalide");
    }
    return NextResponse.next();
  }

  // Pages : pose le jeton CSRF à la première visite. Pas httpOnly : le script de la page doit le
  // lire pour le recopier dans l'en-tête ; un autre site, lui, ne peut pas le lire.
  const reponse = NextResponse.next();
  if (!requete.cookies.has(NOM_COOKIE_CSRF)) {
    reponse.cookies.set(NOM_COOKIE_CSRF, genererJetonCsrf(), {
      path: "/",
      sameSite: "strict",
      // Derrière Caddy, Next reçoit du http : c'est X-Forwarded-Proto qui dit si le client est en https.
      secure:
        requete.headers.get("x-forwarded-proto") === "https" ||
        requete.nextUrl.protocol === "https:",
    });
  }
  return reponse;
}

export const config = {
  // Ni les fichiers du build, ni les images, ni le service worker : ils n'ont besoin d'aucun des deux.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|memes/|sw.js).*)"],
};
