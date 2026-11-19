// Outils du flux temps réel (SCRUM-84) : format Server-Sent Events et plafond de connexions.

// Un événement SSE : une ligne `data:` (le JSON ne contient pas de saut de ligne) et une ligne vide.
export function evenementSse(donnees: unknown): string {
  return `data: ${JSON.stringify(donnees)}\n\n`;
}

// Commentaire SSE : ignoré par EventSource, il garde la connexion ouverte à travers les proxys qui
// coupent les connexions muettes.
export const BATTEMENT_SSE = ": ping\n\n";

// En-têtes d'un flux : `no-transform` empêche la compression (Next et Caddy), qui mettrait les
// événements en tampon ; `X-Accel-Buffering: no` fait de même pour un éventuel nginx.
export const ENTETES_SSE = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
} as const;

// Un flux garde une connexion ouverte : sans plafond, quelques onglets suffiraient à épuiser le
// serveur. La limitation de débit compte les requêtes, pas les connexions qui durent ; ce compteur
// les borne par session et au total. En mémoire, comme la limitation de débit : une seule instance.
export type CompteurFlux = { acquerir(cle: string): boolean; liberer(cle: string): void };

export function creerCompteurFlux({
  maxParCle,
  maxTotal,
}: {
  maxParCle: number;
  maxTotal: number;
}): CompteurFlux {
  const ouverts = new Map<string, number>();
  let total = 0;
  return {
    acquerir(cle) {
      const n = ouverts.get(cle) ?? 0;
      if (n >= maxParCle || total >= maxTotal) return false;
      ouverts.set(cle, n + 1);
      total += 1;
      return true;
    },
    liberer(cle) {
      const n = ouverts.get(cle) ?? 0;
      if (n <= 0) return;
      if (n === 1) ouverts.delete(cle);
      else ouverts.set(cle, n - 1);
      total -= 1;
    },
  };
}
