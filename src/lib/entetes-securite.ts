// En-têtes de sécurité HTTP (SCRUM-72) et Content Security Policy (SCRUM-68), posés sur toutes les
// réponses par `next.config.ts` (y compris les pages statiques, ce que le proxy seul ne garantit pas).
//
// CSP sans nonce : un nonce impose le rendu dynamique de toutes les pages et n'est pas compatible
// avec Cache Components (pré-rendu partiel). On garde le SSG ; le seul relâchement est
// `'unsafe-inline'` sur les scripts, nécessaire aux scripts inline de Next (données RSC). Tout le
// reste est fermé : aucune origine externe, pas de plugin, pas de <base> ni de formulaire vers un
// autre site, pas d'affichage dans un cadre. Voir docs/securite.md.
export function politiqueCsp(developpement: boolean): string {
  return [
    "default-src 'self'",
    // `'unsafe-eval'` en développement seulement : React s'en sert pour reconstruire les piles d'erreurs.
    `script-src 'self' 'unsafe-inline'${developpement ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function entetesSecurite(developpement: boolean): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: politiqueCsp(developpement) },
    // HTTPS imposé pour un an (ignoré par le navigateur tant que le site est servi en http).
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
