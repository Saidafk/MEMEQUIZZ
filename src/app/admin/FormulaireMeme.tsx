"use client";

import { useActionState } from "react";
import boutons from "@/components/BoutonLien.module.css";
import { LICENCES_LIBRES } from "@/db/schema";
import { libelleLicence } from "@/lib/licences";
import type { EtatFormulaire } from "./actions";
import styles from "./admin.module.css";

export type ValeursMeme = {
  nom: string;
  annee_origine: number | null;
  origine: string | null;
  auteur: string;
  licence: string;
  source_url: string;
  article_url: string | null;
};

type Props = {
  action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  valeurs?: ValeursMeme;
  // En édition l'image est facultative (l'actuelle est conservée) ; à la création elle est obligatoire.
  imageObligatoire: boolean;
};

export function FormulaireMeme({ action, valeurs, imageObligatoire }: Props) {
  const [etat, soumettre, enCours] = useActionState(action, { erreurs: [] });
  return (
    <form action={soumettre} className={styles.formulaire}>
      <label htmlFor="nom">Nom du mème (bonne réponse)</label>
      <input
        id="nom"
        name="nom"
        required
        maxLength={120}
        defaultValue={valeurs?.nom}
        className={styles.champ}
      />

      <label htmlFor="image">
        Image {imageObligatoire ? "" : "(laisser vide pour garder l'actuelle) "}— JPEG, PNG ou WebP,
        convertie en WebP 800 px / 100 Ko
      </label>
      <input
        id="image"
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={imageObligatoire}
        className={styles.champ}
      />

      <label htmlFor="annee_origine">Année d&apos;origine (facultatif)</label>
      <input
        id="annee_origine"
        name="annee_origine"
        type="number"
        min={1800}
        max={2100}
        defaultValue={valeurs?.annee_origine ?? ""}
        className={styles.champ}
      />

      <label htmlFor="origine">Origine, reformulée en 1 à 2 phrases (facultatif)</label>
      <textarea
        id="origine"
        name="origine"
        maxLength={500}
        rows={3}
        defaultValue={valeurs?.origine ?? ""}
        className={styles.champ}
      />

      <label htmlFor="auteur">
        Auteur de l&apos;image (facultatif, « Auteur inconnu » par défaut)
      </label>
      <input
        id="auteur"
        name="auteur"
        maxLength={200}
        defaultValue={valeurs?.auteur}
        className={styles.champ}
      />

      <label htmlFor="licence">Licence libre de l&apos;image</label>
      <select
        id="licence"
        name="licence"
        required
        defaultValue={valeurs?.licence ?? ""}
        className={styles.champ}
      >
        <option value="" disabled>
          Choisir…
        </option>
        {valeurs?.licence === "non_verifiee" && (
          <option value="non_verifiee">{libelleLicence("non_verifiee")} (inchangée)</option>
        )}
        {LICENCES_LIBRES.map((l) => (
          <option key={l} value={l}>
            {libelleLicence(l)}
          </option>
        ))}
      </select>

      <label htmlFor="source_url">Page Wikimedia Commons du fichier (facultatif, https)</label>
      <input
        id="source_url"
        name="source_url"
        type="url"
        maxLength={500}
        defaultValue={valeurs?.source_url}
        className={styles.champ}
      />

      <label htmlFor="article_url">Article Wikipédia du mème (facultatif, https)</label>
      <input
        id="article_url"
        name="article_url"
        type="url"
        maxLength={500}
        defaultValue={valeurs?.article_url ?? ""}
        className={styles.champ}
      />

      <p role="alert" className={styles.erreur}>
        {etat.erreurs.map((e) => `✗ ${e}`).join(" ")}
      </p>
      <button type="submit" className={`${boutons.bouton} ${boutons.plein}`} disabled={enCours}>
        {enCours ? "Envoi…" : "Enregistrer"}
      </button>
    </form>
  );
}
