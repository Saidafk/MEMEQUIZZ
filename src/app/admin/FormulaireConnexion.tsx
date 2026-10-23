"use client";

import { useActionState } from "react";
import boutons from "@/components/BoutonLien.module.css";
import { connexion } from "./actions";
import styles from "./admin.module.css";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(connexion, { erreurs: [] });
  return (
    <form action={action} className={styles.formulaire}>
      <label htmlFor="mot_de_passe">Mot de passe administrateur</label>
      <input
        id="mot_de_passe"
        name="mot_de_passe"
        type="password"
        autoComplete="current-password"
        required
        className={styles.champ}
      />
      <p role="alert" className={styles.erreur}>
        {etat.erreurs.map((e) => `✗ ${e}`).join(" ")}
      </p>
      <button type="submit" className={`${boutons.bouton} ${boutons.plein}`} disabled={enCours}>
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
