"use client";

import type { LettreReponse } from "@/lib/types";
import styles from "./BoutonReponse.module.css";

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
  // Après une réponse, le bouton reste focalisable (aria-disabled) : `disabled`
  // ferait perdre le focus au joueur au clavier. Seul l'état « desactive » est vraiment inerte.
  const verrouille = etat !== "normal";
  const classes = [styles.bouton, styles[etat]].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className={classes}
      disabled={etat === "desactive"}
      aria-disabled={verrouille || undefined}
      onClick={() => {
        if (!verrouille) onChoisir?.(lettre);
      }}
    >
      <span className={styles.lettre}>{lettre}.</span>
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
      {ANNONCE[etat] && <span className="masque-visuel"> — {ANNONCE[etat]}</span>}
    </button>
  );
}
