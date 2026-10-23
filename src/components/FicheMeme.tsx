import { imageAdaptee, libelleLicence } from "@/lib/licences";
import type { FicheMemeDonnees } from "@/lib/types";
import styles from "./FicheMeme.module.css";

// Crédits de l'image, à afficher à la correction (docs/droits-images.md).
export type CreditsImage = { auteur: string; licence: string; sourceUrl: string };

type Props = {
  fiche: FicheMemeDonnees;
  credits?: CreditsImage;
  articleUrl?: string | null;
  // « h1 » sur la page propre au mème ; « h3 » quand la fiche est dans un écran de jeu.
  niveauTitre?: "h1" | "h3";
};

// Lien vers l'article seulement s'il s'agit d'une adresse https de Wikipédia (jamais un
// `javascript:` venu des données) ; la langue de l'article est indiquée quand ce n'est pas le français.
function libelleArticle(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" || !hostname.endsWith(".wikipedia.org")) return null;
    return hostname.startsWith("fr.") ? "Wikipédia" : "Wikipédia (en anglais)";
  } catch {
    return null;
  }
}

// Les champs vides ne sont pas rendus : un paragraphe vide ferait un blanc muet pour un lecteur d'écran.
export function FicheMeme({ fiche, credits, articleUrl, niveauTitre = "h3" }: Props) {
  const libelle = libelleArticle(articleUrl);
  const Titre = niveauTitre;
  return (
    <article className={styles.fiche}>
      <Titre className={styles.nom}>
        <span className={styles.surligne}>{fiche.nom}</span>
      </Titre>
      {fiche.origine && <p className={styles.origine}>{fiche.origine}</p>}
      {libelle && articleUrl && (
        <p className={styles.source}>
          En savoir plus :{" "}
          <a href={articleUrl} target="_blank" rel="noopener noreferrer">
            {libelle}
            <span className="masque-visuel"> (s&apos;ouvre dans un nouvel onglet)</span>
          </a>
        </p>
      )}
      {fiche.description && <p>{fiche.description}</p>}
      {fiche.source && <p className={styles.source}>{fiche.source}</p>}
      {credits && (
        <p className={styles.source}>
          Image : {credits.auteur} · {libelleLicence(credits.licence)}
          {imageAdaptee(credits.licence) ? " · image redimensionnée" : ""} ·{" "}
          {/* Lien rendu seulement pour une adresse https : jamais un `javascript:` venu des données. */}
          {credits.sourceUrl.startsWith("https://") ? (
            <a href={credits.sourceUrl} target="_blank" rel="noopener noreferrer">
              source<span className="masque-visuel"> (s&apos;ouvre dans un nouvel onglet)</span>
            </a>
          ) : (
            "source non disponible"
          )}
        </p>
      )}
    </article>
  );
}
