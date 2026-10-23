"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState, useSyncExternalStore } from "react";
import boutons from "@/components/BoutonLien.module.css";
import { pseudoSchema } from "@/lib/validation";
import styles from "./page.module.css";

const MESSAGE_RESEAU = "Impossible de joindre le serveur. Vérifie ta connexion et réessaie.";

// Démarre une partie : le pseudo est contrôlé avec le même schéma que le serveur (qui le rejoue
// toujours), puis POST /api/parties pose le cookie de session et renvoie l'identifiant de la partie.
export function FormulairePartie() {
  const router = useRouter();
  const idErreur = useId();
  const champ = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Faux pour le HTML rendu côté serveur, vrai une fois la page interactive : tant qu'elle ne l'est
  // pas, le bouton est inactif. Sans cela, une soumission trop précoce serait une navigation native
  // qui mettrait le pseudo dans l'adresse (?pseudo=...).
  const interactif = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  function echec(message: string) {
    setErreur(message);
    setEnvoi(false);
    champ.current?.focus();
  }

  async function demarrer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (envoi) return;

    const verif = pseudoSchema.safeParse(champ.current?.value ?? "");
    if (!verif.success) {
      echec(verif.error.issues[0]?.message ?? "Pseudo invalide.");
      return;
    }

    setErreur(null);
    setEnvoi(true);
    try {
      const reponse = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo: verif.data }),
      });
      if (reponse.status === 201) {
        const { id_partie } = (await reponse.json()) as { id_partie: number };
        router.push(`/jeu/${id_partie}`);
        return;
      }
      if (reponse.status === 400) {
        const corps = (await reponse.json()) as { details?: { message: string }[] };
        echec(corps.details?.[0]?.message ?? "Pseudo invalide.");
      } else {
        echec("Le jeu n'est pas disponible pour le moment. Réessaie dans un instant.");
      }
    } catch {
      echec(MESSAGE_RESEAU);
    }
  }

  return (
    <form className={styles.formulaire} onSubmit={demarrer} method="post" noValidate>
      <label htmlFor="pseudo" className={styles.etiquette}>
        Ton pseudo
      </label>
      <input
        ref={champ}
        id="pseudo"
        name="pseudo"
        className={styles.champ}
        placeholder="ex. Gribouille42"
        autoComplete="nickname"
        maxLength={20}
        required
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? idErreur : undefined}
      />
      {/* Toujours monté : seul son contenu change, ce qui est annoncé de façon fiable. */}
      <p id={idErreur} role="alert" className={styles.erreur}>
        {erreur ? `✗ ${erreur}` : ""}
      </p>
      <button
        type="submit"
        className={`${boutons.bouton} ${boutons.plein} ${styles.envoyer}`}
        disabled={!interactif}
        aria-disabled={envoi || undefined}
      >
        {envoi ? "Démarrage…" : "C'est parti →"}
      </button>
      <Link href="/classement" className={styles.lien}>
        Voir le classement
      </Link>
      <Link href="/entrainement" className={styles.lien}>
        S&apos;entraîner (sans score, même hors ligne)
      </Link>
    </form>
  );
}
