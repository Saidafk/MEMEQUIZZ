// Le décompte repose sur une échéance (heure de fin) et non sur un compteur décrémenté : un onglet
// en arrière-plan ralentit les minuteurs, mais l'heure réelle, elle, continue d'avancer.
export function echeance(maintenantMs: number, restantMs: number): number {
  return maintenantMs + Math.max(0, restantMs);
}

export function secondesRestantes(echeanceMs: number, maintenantMs: number): number {
  return Math.max(0, Math.ceil((echeanceMs - maintenantMs) / 1000));
}

// « en 1 seconde », « en 4 secondes » : jamais « en 0 seconde » pour une réponse déjà donnée.
export function libelleDelai(delaiMs: number): string {
  const secondes = Math.max(1, Math.ceil(delaiMs / 1000));
  return `en ${secondes} seconde${secondes > 1 ? "s" : ""}`;
}
