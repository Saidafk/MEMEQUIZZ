import { imageAdaptee, libelleLicence } from "@/lib/licences";
import type { FicheMemeDonnees } from "@/lib/types";
import styles from "./FicheMeme.module.css";

// Crédits de l'image, à afficher à la correction (docs/droits-images.md).
export type CreditsImage = { auteur: string; licence: string; sourceUrl: string };

type Props = { fiche: FicheMemeDonnees; credits?: CreditsImage };

// Les champs vides ne sont pas rendus : un paragraphe vide ferait un blanc muet pour un lecteur d'écran.
export function FicheMeme({ fiche, credits }: Props) {
  return (
    <article className={styles.fiche}>
      <h3 className={styles.nom}>
        <span className={styles.surligne}>{fiche.nom}</span>
      </h3>
      {fiche.origine && <p className={styles.origine}>{fiche.origine}</p>}
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
