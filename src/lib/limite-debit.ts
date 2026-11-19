// Limitation de débit de l'API (SCRUM-72) : compteur par fenêtre fixe et par clé (adresse IP).
// En mémoire : suffisant pour une seule instance (le VPS) ; plusieurs instances demanderaient un
// stockage partagé (Redis). La fenêtre fixe tolère jusqu'à 2 × max à cheval sur deux fenêtres :
// acceptable pour freiner un script, pas pour compter au plus juste.
export type VerdictDebit = { autorise: boolean; reessayerApresS: number };

export type Limiteur = { consommer(cle: string, maintenant?: number): VerdictDebit };

type Compteur = { debut: number; nombre: number };

export function creerLimiteur({
  max,
  fenetreMs,
  clesMax = 10_000,
}: {
  max: number;
  fenetreMs: number;
  clesMax?: number;
}): Limiteur {
  const compteurs = new Map<string, Compteur>();

  // Borne la mémoire : on retire les fenêtres échues, et si un flot d'adresses différentes remplit
  // encore la table, on la vide (mieux vaut relâcher la limite que faire tomber le serveur).
  function purger(maintenant: number) {
    for (const [cle, compteur] of compteurs) {
      if (maintenant - compteur.debut >= fenetreMs) compteurs.delete(cle);
    }
    if (compteurs.size >= clesMax) compteurs.clear();
  }

  return {
    consommer(cle, maintenant = Date.now()) {
      let compteur = compteurs.get(cle);
      if (!compteur || maintenant - compteur.debut >= fenetreMs) {
        if (!compteur && compteurs.size >= clesMax) purger(maintenant);
        compteur = { debut: maintenant, nombre: 0 };
        compteurs.set(cle, compteur);
      }
      compteur.nombre += 1;
      if (compteur.nombre <= max) return { autorise: true, reessayerApresS: 0 };
      return {
        autorise: false,
        reessayerApresS: Math.max(1, Math.ceil((compteur.debut + fenetreMs - maintenant) / 1000)),
      };
    },
  };
}

// Adresse du client derrière Caddy : l'entrée la plus à droite de X-Forwarded-For est celle ajoutée
// par notre propre proxy ; celles de gauche peuvent être inventées par le client.
export function adresseClient(entetes: Headers): string {
  const transmis = entetes.get("x-forwarded-for");
  const derniere = transmis
    ?.split(",")
    .map((morceau) => morceau.trim())
    .filter(Boolean)
    .at(-1);
  return derniere ?? entetes.get("x-real-ip") ?? "inconnue";
}
