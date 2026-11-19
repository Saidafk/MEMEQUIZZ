"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState, useSyncExternalStore } from "react";
import boutons from "@/components/BoutonLien.module.css";
import { MESSAGE_RESEAU } from "@/lib/affichage-reponse";
import { MESSAGE_JETON_CSRF, entetesJsonCsrf } from "@/lib/csrf";
import { codeSalleSchema, pseudoSchema } from "@/lib/validation";
import styles from "../page.module.css";

const MESSAGES_ERREUR: Record<string, string> = {
  introuvable: "Aucune salle avec ce code. Vérifie-le auprès de l'hôte.",
  salle_commencee: "La partie de cette salle a déjà commencé.",
  salle_pleine: "Cette salle est complète.",
};

// Créer une salle (l'hôte) ou en rejoindre une avec son code (SCRUM-83). Les champs sont contrôlés
// avec les schémas du serveur, qui les rejoue toujours.
export function FormulaireSalle({ mode }: { mode: "creer" | "rejoindre" }) {
  const router = useRouter();
  const id = useId();
  const champCode = useRef<HTMLInputElement>(null);
  const champPseudo = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<{ champ: "code" | "pseudo"; message: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Inactif tant que la page n'est pas interactive (voir FormulairePartie).
  const interactif = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  function echec(champ: "code" | "pseudo", message: string) {
    setErreur({ champ, message });
    setEnvoi(false);
    (champ === "code" ? champCode : champPseudo).current?.focus();
  }

  async function envoyer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (envoi) return;

    let code = "";
    if (mode === "rejoindre") {
      const verifCode = codeSalleSchema.safeParse(champCode.current?.value ?? "");
      if (!verifCode.success) {
        echec("code", verifCode.error.issues[0]?.message ?? "Code invalide.");
        return;
      }
      code = verifCode.data;
    }
    const verifPseudo = pseudoSchema.safeParse(champPseudo.current?.value ?? "");
    if (!verifPseudo.success) {
      echec("pseudo", verifPseudo.error.issues[0]?.message ?? "Pseudo invalide.");
      return;
    }

    setErreur(null);
    setEnvoi(true);
    try {
      const reponse = await fetch(
        mode === "creer" ? "/api/salles" : `/api/salles/${code}/joueurs`,
        {
          method: "POST",
          headers: entetesJsonCsrf(),
          body: JSON.stringify({ pseudo: verifPseudo.data }),
        },
      );
      const corps = (await reponse.json().catch(() => ({}))) as {
        code?: string;
        erreur?: string;
        details?: { champ: string; message: string }[];
      };
      if (reponse.status === 201 && corps.code) {
        router.push(`/salle/${corps.code}`);
        return;
      }
      if (reponse.status === 400) {
        const detail = corps.details?.[0];
        echec(detail?.champ === "code" ? "code" : "pseudo", detail?.message ?? "Saisie invalide.");
      } else if (reponse.status === 403) {
        echec("pseudo", MESSAGE_JETON_CSRF);
      } else if (corps.erreur && MESSAGES_ERREUR[corps.erreur]) {
        echec("code", MESSAGES_ERREUR[corps.erreur] ?? "");
      } else {
        echec("pseudo", "Le jeu n'est pas disponible pour le moment. Réessaie dans un instant.");
      }
    } catch {
      echec("pseudo", MESSAGE_RESEAU);
    }
  }

  const idErreur = `${id}-erreur`;
  const decrit = (champ: "code" | "pseudo") =>
    erreur?.champ === champ ? { "aria-invalid": true as const, "aria-describedby": idErreur } : {};

  return (
    <form className={styles.formulaire} onSubmit={envoyer} method="post" noValidate>
      {mode === "rejoindre" && (
        <>
          <label htmlFor={`${id}-code`} className={styles.etiquette}>
            Code de la salle
          </label>
          <input
            ref={champCode}
            id={`${id}-code`}
            name="code"
            className={styles.champ}
            placeholder="ex. K7M2QX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            required
            {...decrit("code")}
          />
        </>
      )}
      <label htmlFor={`${id}-pseudo`} className={styles.etiquette}>
        Ton pseudo
      </label>
      <input
        ref={champPseudo}
        id={`${id}-pseudo`}
        name="pseudo"
        className={styles.champ}
        placeholder="ex. Gribouille42"
        autoComplete="nickname"
        maxLength={20}
        required
        {...decrit("pseudo")}
      />
      <p id={idErreur} role="alert" className={styles.erreur}>
        {erreur ? `✗ ${erreur.message}` : ""}
      </p>
      <button
        type="submit"
        className={`${boutons.bouton} ${mode === "creer" ? boutons.plein : boutons.contour} ${styles.envoyer}`}
        disabled={!interactif}
        aria-disabled={envoi || undefined}
      >
        {mode === "creer"
          ? envoi
            ? "Création…"
            : "Créer une salle →"
          : envoi
            ? "Connexion…"
            : "Rejoindre la salle →"}
      </button>
    </form>
  );
}
