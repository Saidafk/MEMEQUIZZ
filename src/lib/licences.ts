// Libellés affichés pour les licences d'images (voir docs/droits-images.md).
const LIBELLES: Record<string, string> = {
  domaine_public: "domaine public",
  cc0: "CC0",
  cc_by: "CC BY",
  cc_by_sa: "CC BY-SA",
};

export function libelleLicence(licence: string): string {
  return LIBELLES[licence] ?? licence;
}

// CC BY et CC BY-SA imposent d'indiquer que l'image a été modifiée : les images du jeu sont
// réduites et converties en WebP.
export function imageAdaptee(licence: string): boolean {
  return licence === "cc_by" || licence === "cc_by_sa";
}
