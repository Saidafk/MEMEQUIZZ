// Règles de score de la démo. En v0.3, ce calcul passe côté serveur (jamais confié au client).
export const DUREE_QUESTION_S = 15;
export const POINTS_MAX = 1000;
export const POINTS_MIN_BONNE_REPONSE = 100;

// Plus on répond vite, plus on marque ; une bonne réponse vaut toujours au moins 100 points.
export function calculerPoints(
  juste: boolean,
  secondesRestantes: number,
  duree: number = DUREE_QUESTION_S,
): number {
  if (!juste) return 0;
  const restantes = Math.max(0, Math.min(duree, secondesRestantes));
  return Math.max(POINTS_MIN_BONNE_REPONSE, Math.round((POINTS_MAX * restantes) / duree));
}
