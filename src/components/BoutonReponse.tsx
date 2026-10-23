"use client";

import styles from "./BoutonReponse.module.css";

export type LettreReponse = "A" | "B" | "C" | "D";
export type EtatReponse = "normal" | "correct" | "faux" | "desactive";

type Props = {
  lettre: LettreReponse;
  libelle: string;
  etat?: EtatReponse;
  onChoisir?: (lettre: LettreReponse) => void;
};

// Le résultat n'est jamais porté par la seule couleur (WCAG 1.4.1) : icône + texte masqué.
const ANNONCE: Record<EtatReponse, string> = {
  normal: "",
  correct: "bonne réponse",
  faux: "mauvaise réponse",
  desactive: "",
};

export function BoutonReponse({ lettre, libelle, etat = "normal", onChoisir }: Props) {
  const verrouille = etat !== "normal";
  return (
    <button
      type="button"
      className={`${styles.bouton} ${styles[etat] ?? ""}`}
      disabled={verrouille}
      onClick={() => onChoisir?.(lettre)}
    >
      <span className={styles.lettre} aria-hidden="true">
        {lettre}.
      </span>
      <span className={styles.libelle}>{libelle}</span>
      {etat === "correct" && (
        <span className={styles.icone} aria-hidden="true">
          ✓
        </span>
      )}
      {etat === "faux" && (
        <span className={styles.icone} aria-hidden="true">
          ✗
        </span>
      )}
      {ANNONCE[etat] && <span className={styles.masque}> — {ANNONCE[etat]}</span>}
    </button>
  );
}
