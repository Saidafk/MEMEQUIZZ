// Import des modèles de memegen.link (SCRUM-97). Fonctions pures, testées sans réseau ni base ;
// le script qui télécharge et insère est src/db/importer-memegen.ts.

export type ModeleMemegen = {
  id: string;
  name: string;
  blank: string;
  source?: string | null;
};

export type LigneMemeImport = {
  slug: string;
  nom: string;
  source_url: string;
  image_chemin: string;
  auteur: string;
  licence: "non_verifiee";
};

// Le slug respecte la forme des fichiers servis (`[a-z0-9]+(-[a-z0-9]+)*`) ; le préfixe évite toute
// collision avec les mèmes curés ou saisis dans le backoffice.
export function slugMemegen(id: string): string {
  const base = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `memegen-${base || "sans-id"}`.slice(0, 80).replace(/-+$/g, "");
}

// Deux identifiants distincts peuvent donner le même slug une fois normalisés : le suivant reçoit
// un suffixe numérique. Déterministe tant que l'ordre de l'API ne change pas.
export function slugsUniques(modeles: readonly ModeleMemegen[]): string[] {
  const pris = new Set<string>();
  return modeles.map((m) => {
    const base = slugMemegen(m.id);
    let slug = base;
    for (let n = 2; pris.has(slug); n += 1) slug = `${base}-${n}`;
    pris.add(slug);
    return slug;
  });
}

export function ligneImport(
  modele: ModeleMemegen,
  slug: string = slugMemegen(modele.id),
): LigneMemeImport {
  const source = modele.source ?? "";
  return {
    slug,
    nom: modele.name.trim().slice(0, 120),
    // `source_url` est limité à 500 caractères et doit être un lien https (sinon : vide).
    source_url: source.startsWith("https://") && source.length <= 500 ? source : "",
    image_chemin: `/memes/${slug}.webp`,
    auteur: "Auteur inconnu",
    licence: "non_verifiee",
  };
}

const texteSql = (valeur: string) => `'${valeur.replaceAll("'", "''")}'`;

// Fichier SQL rejouable pour une base sans `bun` (le VPS) : upsert sur le slug. `actif` n'est pas
// modifié à la mise à jour, pour ne pas réactiver un mème désactivé depuis le backoffice.
export function genererSql(lignes: readonly LigneMemeImport[]): string {
  if (lignes.length === 0) return "";
  const valeurs = lignes.map(
    (l) =>
      `(${[l.slug, l.nom, l.source_url, l.image_chemin, l.auteur, l.licence].map(texteSql).join(", ")}, true, true)`,
  );
  return `-- Import memegen.link (SCRUM-97) : licence non vérifiée.
INSERT INTO meme (slug, nom, source_url, image_chemin, auteur, licence, actif, via_backoffice)
VALUES
${valeurs.join(",\n")}
ON CONFLICT (slug) DO UPDATE SET
  nom = excluded.nom,
  source_url = excluded.source_url,
  image_chemin = excluded.image_chemin,
  licence = excluded.licence;
`;
}
