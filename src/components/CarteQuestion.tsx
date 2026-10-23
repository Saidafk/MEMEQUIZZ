import { useId, type ReactNode } from "react";
import styles from "./CarteQuestion.module.css";

type Props = {
  // `null` : seule l'image est affichée, l'intitulé est rendu à part par la page (mise en page bureau).
  intitule?: string | null;
  // Image du mème ; absente tant que la question des images n'est pas tranchée (SCRUM-34).
  image?: ReactNode;
};

export function CarteQuestion({ intitule = "C'est quel mème ?", image }: Props) {
  const idIntitule = useId();
  return (
    <section
      className={styles.carte}
      aria-labelledby={intitule === null ? undefined : idIntitule}
      aria-label={intitule === null ? "Image du mème" : undefined}
    >
      <div className={styles.cadre}>
        {image ?? (
          <div className={styles.vide}>
            <svg
              width="56"
              height="56"
              viewBox="0 0 56 56"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="6" y="10" width="44" height="36" rx="4" />
              <circle cx="20" cy="22" r="4" />
              <path d="M8 42 L22 30 L32 38 L40 30 L48 38" />
            </svg>
            <span>[IMAGE DU MÈME]</span>
          </div>
        )}
      </div>
      {intitule !== null && (
        <h2 id={idIntitule} className={styles.intitule}>
          {intitule}
        </h2>
      )}
    </section>
  );
}
