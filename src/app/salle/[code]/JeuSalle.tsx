"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import boutons from "@/components/BoutonLien.module.css";
import carte from "@/components/Carte.module.css";
import { LigneClassement } from "@/components/LigneClassement";
import { MESSAGE_RESEAU } from "@/lib/affichage-reponse";
import { MESSAGE_JETON_CSRF, entetesJsonCsrf } from "@/lib/csrf";
import type { EtatSalle, JoueurSalle } from "@/lib/salles";
import { Partie } from "../../jeu/Partie";
import styles from "../salle.module.css";

const formatPoints = new Intl.NumberFormat("fr-FR");

type Connexion =
  | { phase: "connexion" }
  | { phase: "perdue" }
  | { phase: "ok"; etat: EtatSalle; reconnexion: boolean };

// Salle multijoueur côté navigateur (SCRUM-83/84). Tout l'état vient du flux SSE du serveur :
// salle d'attente, question ouverte, scores. Le navigateur n'écrit que par les POST habituels
// (réponses, lancement par l'hôte).
export function JeuSalle({ code }: { code: string }) {
  const [connexion, setConnexion] = useState<Connexion>({ phase: "connexion" });
  const [fini, setFini] = useState(false);
  const surFin = useCallback(() => setFini(true), []);

  useEffect(() => {
    const source = new EventSource(`/api/salles/${code}/flux`);
    source.onmessage = (evenement: MessageEvent<string>) => {
      const etat = JSON.parse(evenement.data) as EtatSalle;
      setConnexion({ phase: "ok", etat, reconnexion: false });
      // Salle finie : le serveur ferme le flux ; sans close(), EventSource se reconnecterait.
      if (etat.statut === "terminee") source.close();
    };
    source.onerror = () => {
      // CLOSED : refus du serveur (pas membre, session expirée, trop de flux) ; sinon EventSource
      // retente seul, on le signale simplement.
      if (source.readyState === EventSource.CLOSED) setConnexion({ phase: "perdue" });
      else setConnexion((c) => (c.phase === "ok" ? { ...c, reconnexion: true } : c));
    };
    return () => source.close();
  }, [code]);

  if (connexion.phase === "connexion") {
    return <p role="status">Connexion à la salle…</p>;
  }

  if (connexion.phase === "perdue") {
    return (
      <div role="alert" className={styles.page}>
        <h1 className={styles.titre}>Salle indisponible</h1>
        <p className={styles.erreur}>
          ✗ Cette salle n&apos;existe pas, ou tu n&apos;en fais pas partie (session expirée ?).
        </p>
        <Link href="/salle" className={styles.lien}>
          Créer ou rejoindre une salle
        </Link>
      </div>
    );
  }

  const { etat, reconnexion } = connexion;
  const alerteReconnexion = (
    <p role="status" className={styles.erreur}>
      {reconnexion ? "✗ Connexion perdue, reconnexion…" : ""}
    </p>
  );

  if (etat.statut === "attente") {
    return (
      <div className={carte.colonnes}>
        <div className={styles.bloc}>
          <h1 className={styles.titre}>Salle d&apos;attente</h1>
          <p>Donne ce code à tes amis : ils le saisissent sur la page « Jouer entre amis ».</p>
          <p className={styles.code}>{etat.code}</p>
          <BoutonCopier />
          {alerteReconnexion}
          {etat.hote ? (
            <BoutonLancer code={etat.code} nombre={etat.joueurs.length} />
          ) : (
            <p>En attente du lancement par l&apos;hôte…</p>
          )}
        </div>
        <ListeJoueurs etat={etat} titre="Joueurs présents" grille />
      </div>
    );
  }

  if (etat.statut === "terminee") {
    const moi = etat.joueurs.find((j) => j.moi);
    return (
      <div className={carte.colonnes}>
        <div className={styles.bloc}>
          <h1 className={styles.titre}>Partie terminée !</h1>
          {moi && (
            <p className={`${carte.surligne} ${styles.place}`}>
              Ta place dans la salle
              <span className={styles.gros}>
                {moi.rang}
                <sup>e</sup> sur {etat.joueurs.length} · {formatPoints.format(moi.score)} pts
              </span>
            </p>
          )}
          <nav aria-label="Après la partie" className={styles.actions}>
            <Link
              href={`/resultat/${etat.id_partie}`}
              className={`${boutons.bouton} ${boutons.plein}`}
            >
              Mon résultat détaillé
            </Link>
            <Link href="/salle" className={`${boutons.bouton} ${boutons.contour}`}>
              Rejouer entre amis
            </Link>
          </nav>
        </div>
        <ListeJoueurs etat={etat} titre="Classement de la salle" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className="masque-visuel">Partie en salle {etat.code}</h1>
      {alerteReconnexion}
      {fini ? (
        <p role="status">Tu as terminé ! En attente des autres joueurs…</p>
      ) : (
        <Partie idPartie={etat.id_partie} salle={{ rangOuvert: etat.rang_courant, surFin }} />
      )}
      <ListeJoueurs etat={etat} titre="Classement en direct" grille />
    </div>
  );
}

function noteJoueur(j: JoueurSalle, statut: EtatSalle["statut"]): string | undefined {
  if (statut === "en_cours") return j.a_repondu ? "a répondu" : undefined;
  return j.hote ? "hôte" : undefined;
}

function ListeJoueurs({
  etat,
  titre,
  grille = false,
}: {
  etat: EtatSalle;
  titre: string;
  // Joueurs sur plusieurs colonnes en grand écran (attente, bande « en direct » sous la question).
  grille?: boolean;
}) {
  const n = etat.joueurs.length;
  return (
    <section aria-labelledby="titre-joueurs" className={carte.carte}>
      <h2 id="titre-joueurs">{titre}</h2>
      {/* Seul le nombre de joueurs est annoncé : relire toute la liste à chaque point marqué
          couvrirait la question en cours. */}
      <p aria-live="polite">
        {n} joueur{n > 1 ? "s" : ""} dans la salle
      </p>
      <ol className={`${styles.liste} ${grille ? styles.grille : ""}`}>
        {etat.joueurs.map((j) => (
          <LigneClassement
            key={`${j.pseudo}-${j.rang}-${j.moi}`}
            rang={j.rang}
            pseudo={j.pseudo}
            score={j.score}
            moi={j.moi}
            note={noteJoueur(j, etat.statut)}
          />
        ))}
      </ol>
    </section>
  );
}

// Copie l'adresse de la salle : plus simple à envoyer qu'un code à recopier.
function BoutonCopier() {
  const [message, setMessage] = useState("");
  async function copier() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Lien copié !");
    } catch {
      setMessage("Copie impossible : partage le code ci-dessus.");
    }
  }
  return (
    <div className={styles.copie}>
      <button
        type="button"
        className={`${boutons.bouton} ${boutons.contour} ${styles.lancer}`}
        onClick={() => void copier()}
      >
        Copier le lien de la salle
      </button>
      <p role="status">{message}</p>
    </div>
  );
}

function BoutonLancer({ code, nombre }: { code: string; nombre: number }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function lancer() {
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/salles/${code}/lancement`, {
        method: "POST",
        headers: entetesJsonCsrf(),
      });
      // Succès : le flux SSE annonce la question 1, rien d'autre à faire ici.
      if (!reponse.ok) {
        const corps = (await reponse.json().catch(() => ({}))) as { erreur?: string };
        setErreur(
          corps.erreur === "jeton_csrf_invalide"
            ? MESSAGE_JETON_CSRF
            : "La partie n'a pas pu être lancée.",
        );
        setEnvoi(false);
      }
    } catch {
      setErreur(MESSAGE_RESEAU);
      setEnvoi(false);
    }
  }

  return (
    <div className={styles.bloc}>
      <button
        type="button"
        className={`${boutons.bouton} ${boutons.plein} ${styles.lancer}`}
        onClick={() => void lancer()}
        aria-disabled={envoi || undefined}
      >
        {envoi ? "Lancement…" : "Lancer la partie →"}
      </button>
      {nombre < 2 && <p>Tu peux lancer seul, mais c&apos;est plus drôle à plusieurs.</p>}
      <p role="alert" className={styles.erreur}>
        {erreur ? `✗ ${erreur}` : ""}
      </p>
    </div>
  );
}
