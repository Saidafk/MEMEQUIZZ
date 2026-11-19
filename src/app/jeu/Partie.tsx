"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { BandeauResultat } from "@/components/BandeauResultat";
import { BarreScore } from "@/components/BarreScore";
import { BoutonReponse } from "@/components/BoutonReponse";
import { CarteQuestion } from "@/components/CarteQuestion";
import { Chrono } from "@/components/Chrono";
import { FicheMeme } from "@/components/FicheMeme";
import { MESSAGE_RESEAU, detailCorrection, etatReponse } from "@/lib/affichage-reponse";
import { echeance, secondesRestantes } from "@/lib/chrono";
import { MESSAGE_JETON_CSRF, entetesJsonCsrf } from "@/lib/csrf";
import type { ResultatPartie } from "@/lib/parties";
import type { QuestionServie } from "@/lib/questions";
import type { Correction } from "@/lib/reponses";
import { DUREE_QUESTION_S } from "@/lib/score";
import type { LettreReponse } from "@/lib/types";
import { QUESTIONS_PAR_PARTIE } from "@/lib/validation";
import styles from "./Partie.module.css";

const LETTRES: LettreReponse[] = ["A", "B", "C", "D"];
const TOUCHES: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };

const PALIERS_ANNONCES_S = [10, 5];

const MESSAGE_SESSION =
  "Cette partie n'est plus disponible (session expirée ou partie introuvable). Démarres-en une nouvelle.";

type Etat =
  | { phase: "chargement" }
  // En salle : la question suivante n'est pas encore ouverte par la salle.
  | { phase: "attente"; rang: number }
  | { phase: "erreur"; message: string }
  | { phase: "question"; question: QuestionServie; fin: number }
  | { phase: "retour"; question: QuestionServie; choisi: number | null; correction: Correction };

type Corps = { erreur?: string };

async function lireCorps(reponse: Response): Promise<Corps> {
  try {
    return (await reponse.json()) as Corps;
  } catch {
    return {};
  }
}

// Partie jouée dans une salle (SCRUM-83/84) : la salle ouvre les questions une à une (flux SSE) et
// c'est elle qui affiche le résultat final.
export type RythmeSalle = { rangOuvert: number; surFin: () => void };

// Partie jouée contre l'API : les choix, le délai, la correction et le score viennent du serveur.
// Le navigateur n'affiche que le décompte (calculé depuis une échéance) et n'envoie que le mème choisi.
export function Partie({ idPartie, salle }: { idPartie: number; salle?: RythmeSalle }) {
  const router = useRouter();
  // Lue dans les rappels sans les recréer à chaque question ouverte.
  const rangOuvert = useRef(salle?.rangOuvert ?? Infinity);
  const surFinSalle = salle?.surFin;
  useEffect(() => {
    rangOuvert.current = salle?.rangOuvert ?? Infinity;
  }, [salle?.rangOuvert]);
  const [etat, setEtat] = useState<Etat>({ phase: "chargement" });
  const [restant, setRestant] = useState(DUREE_QUESTION_S);
  const [score, setScore] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const envoiEnCours = useRef(false);
  const expirationEnvoyee = useRef<number | null>(null);
  const derniereReponse = useRef<number | null>(null);
  const demarre = useRef(false);
  const boutonSuivant = useRef<HTMLButtonElement>(null);
  const titreQuestion = useRef<HTMLHeadingElement>(null);

  const versResultat = useCallback(
    () => (surFinSalle ? surFinSalle() : router.replace(`/resultat/${idPartie}`)),
    [router, idPartie, surFinSalle],
  );

  const chargerQuestion = useCallback(
    async (rangDemande: number): Promise<void> => {
      setEtat({ phase: "chargement" });
      setErreurEnvoi(null);
      try {
        // Boucle : après un rechargement, des questions peuvent déjà être closes ; on passe
        // à la première qui ne l'est pas.
        for (let rang = rangDemande; rang <= QUESTIONS_PAR_PARTIE; rang += 1) {
          if (rang > rangOuvert.current) {
            setEtat({ phase: "attente", rang });
            return;
          }
          const reponse = await fetch(`/api/parties/${idPartie}/questions/${rang}`, {
            cache: "no-store",
          });
          if (reponse.ok) {
            const question = (await reponse.json()) as QuestionServie;
            const fin = echeance(Date.now(), question.restant_ms);
            setRestant(secondesRestantes(fin, Date.now()));
            setEtat({ phase: "question", question, fin });
            return;
          }
          const { erreur } = await lireCorps(reponse);
          if (reponse.status === 409 && erreur === "partie_terminee") return versResultat();
          // Question déjà close, ou manquée en salle : on passe à la suivante.
          if (
            reponse.status === 409 &&
            (erreur === "question_deja_repondue" || erreur === "question_manquee")
          ) {
            continue;
          }
          if (reponse.status === 409 && erreur === "question_pas_encore_ouverte") {
            setEtat({ phase: "attente", rang });
            return;
          }
          const perdue = reponse.status === 401 || reponse.status === 404;
          setEtat({
            phase: "erreur",
            message: perdue ? MESSAGE_SESSION : "La question n'a pas pu être chargée. Réessaie.",
          });
          return;
        }
        versResultat();
      } catch {
        setEtat({ phase: "erreur", message: MESSAGE_RESEAU });
      }
    },
    [idPartie, versResultat],
  );

  // Au chargement : on reprend là où la partie s'est arrêtée (nouvelle partie = question 1).
  useEffect(() => {
    if (demarre.current) return;
    demarre.current = true;
    (async () => {
      try {
        const reponse = await fetch(`/api/parties/${idPartie}`, { cache: "no-store" });
        if (!reponse.ok) {
          const perdue = reponse.status === 401 || reponse.status === 404;
          setEtat({ phase: "erreur", message: perdue ? MESSAGE_SESSION : "Partie indisponible." });
          return;
        }
        const partie = (await reponse.json()) as ResultatPartie;
        if (partie.statut === "terminee") return versResultat();
        setScore(partie.score);
        // En salle, après un rechargement, on rejoint la question ouverte : celles manquées entre-temps
        // restent sans réponse.
        const reprise = partie.repondues + 1;
        await chargerQuestion(
          Number.isFinite(rangOuvert.current) ? Math.max(reprise, rangOuvert.current) : reprise,
        );
      } catch {
        setEtat({ phase: "erreur", message: MESSAGE_RESEAU });
      }
    })();
  }, [idPartie, chargerQuestion, versResultat]);

  const repondre = useCallback(
    async (idMeme: number | null) => {
      if (etat.phase !== "question" || envoiEnCours.current) return;
      envoiEnCours.current = true;
      derniereReponse.current = idMeme;
      setEnvoi(true);
      setErreurEnvoi(null);
      try {
        const reponse = await fetch("/api/reponses", {
          method: "POST",
          headers: entetesJsonCsrf(),
          body: JSON.stringify({ id_partie: idPartie, rang: etat.question.rang, id_meme: idMeme }),
        });
        if (reponse.ok) {
          const correction = (await reponse.json()) as Correction;
          setScore(correction.score_total);
          setEtat({ phase: "retour", question: etat.question, choisi: idMeme, correction });
          return;
        }
        const { erreur } = await lireCorps(reponse);
        if (reponse.status === 409 && erreur === "partie_terminee") return versResultat();
        if (reponse.status === 409 && erreur === "question_deja_repondue") {
          // Une réponse précédente est bien arrivée : on ne bloque pas le joueur.
          envoiEnCours.current = false;
          return etat.question.rang >= QUESTIONS_PAR_PARTIE
            ? versResultat()
            : chargerQuestion(etat.question.rang + 1);
        }
        setErreurEnvoi(
          reponse.status === 403
            ? MESSAGE_JETON_CSRF
            : "Ta réponse n'a pas pu être envoyée. Réessaie.",
        );
      } catch {
        setErreurEnvoi(MESSAGE_RESEAU);
      } finally {
        envoiEnCours.current = false;
        setEnvoi(false);
      }
    },
    [etat, idPartie, chargerQuestion, versResultat],
  );

  // En salle : dès que la salle ouvre la question attendue, on la charge.
  const rangAttendu = etat.phase === "attente" ? etat.rang : null;
  const rangOuvertSalle = salle?.rangOuvert;
  useEffect(() => {
    if (rangAttendu === null || rangOuvertSalle === undefined || rangOuvertSalle < rangAttendu) {
      return;
    }
    // Hors du rendu de l'effet : le ref rangOuvert est d'abord mis à jour par l'effet précédent.
    const id = setTimeout(() => void chargerQuestion(rangAttendu), 0);
    return () => clearTimeout(id);
  }, [rangAttendu, rangOuvertSalle, chargerQuestion]);

  // Décompte : calculé depuis l'échéance (pas de dérive en arrière-plan). À zéro, on demande la
  // correction sans mème choisi : la question est close avec zéro point. L'envoi automatique n'a
  // lieu qu'une fois par question : en cas d'échec réseau, c'est le bouton « Réessayer » qui reprend,
  // pas une requête toutes les 250 ms.
  useEffect(() => {
    if (etat.phase !== "question") return;
    const { fin, question } = etat;
    const id = setInterval(() => {
      const secondes = secondesRestantes(fin, Date.now());
      setRestant(secondes);
      if (secondes <= 0 && expirationEnvoyee.current !== question.rang) {
        expirationEnvoyee.current = question.rang;
        void repondre(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [etat, repondre]);

  // Clavier : touches A à D pour répondre. Le raccourci n'est actif que lorsque le focus est
  // dans la zone de jeu (WCAG 2.1.4, raccourcis à une seule touche) : il ne gêne ni la
  // navigation d'un lecteur d'écran ni la saisie ailleurs dans la page.
  function surTouche(e: KeyboardEvent<HTMLDivElement>) {
    if (etat.phase !== "question" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const choix = etat.question.choix[TOUCHES[e.key.toLowerCase()] ?? -1];
    if (choix) void repondre(choix.id_meme);
  }

  // Gestion du focus (utilisateur clavier) : à chaque question, sur l'intitulé, pour que les
  // touches A à D fonctionnent tout de suite ; après une réponse, sur « suivante ».
  const rangAffiche = etat.phase === "question" || etat.phase === "retour" ? etat.question.rang : 0;
  useEffect(() => {
    if (etat.phase === "retour") boutonSuivant.current?.focus();
    else if (etat.phase === "question") titreQuestion.current?.focus({ preventScroll: true });
  }, [etat.phase, rangAffiche]);

  if (etat.phase === "chargement") {
    return <p role="status">Chargement de la question…</p>;
  }

  if (etat.phase === "attente") {
    return <p role="status">En attente des autres joueurs avant la question {etat.rang}…</p>;
  }

  if (etat.phase === "erreur") {
    return (
      <div role="alert" className={styles.suite}>
        <p className={styles.alerte}>✗ {etat.message}</p>
        <Link href="/" className={styles.suivante}>
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const { question } = etat;
  const retour = etat.phase === "retour" ? etat : null;
  const bonne = retour?.correction.bonne_reponse;

  const correction = retour && bonne ? { choisi: retour.choisi, idBonne: bonne.id_meme } : null;
  const detail = !retour
    ? ""
    : detailCorrection({
        choisi: retour.choisi,
        enRetard: retour.correction.en_retard,
        delaiMs: retour.correction.delai_ms,
      });

  const derniere = question.rang >= question.total;
  // En salle, la question suivante n'est disponible qu'une fois ouverte pour tous.
  const enAttenteSalle = salle !== undefined && !derniere && question.rang >= salle.rangOuvert;

  function suivante() {
    if (enAttenteSalle) return;
    if (retour?.correction.partie_terminee || derniere) {
      if (surFinSalle) surFinSalle();
      else router.push(`/resultat/${idPartie}`);
      return;
    }
    void chargerQuestion(question.rang + 1);
  }

  return (
    <div className={styles.partie} tabIndex={-1} onKeyDown={surTouche}>
      <div className={styles.barre}>
        <BarreScore question={question.rang} totalQuestions={question.total} score={score} />
      </div>

      <div className={styles.etat}>
        {!retour && <Chrono restant={restant} total={question.duree_s} />}
        {/* Le chrono n'est pas lu à chaque seconde : seuls les paliers sont annoncés. */}
        <div className="masque-visuel" aria-live="polite" aria-atomic="true">
          {!retour && PALIERS_ANNONCES_S.includes(restant)
            ? `${restant} seconde${restant > 1 ? "s" : ""} restantes`
            : ""}
        </div>
        {/* Toujours monté : seul son contenu change, ce qui est annoncé de façon fiable. */}
        <div role="status">
          {retour && (
            <BandeauResultat
              reussi={retour.correction.juste}
              points={retour.correction.points}
              detail={detail}
            />
          )}
        </div>
        <p role="alert" className={styles.alerte}>
          {erreurEnvoi ? `✗ ${erreurEnvoi}` : ""}
        </p>
        {erreurEnvoi && (
          <button
            type="button"
            className={styles.suivante}
            onClick={() => void repondre(derniereReponse.current)}
          >
            Réessayer
          </button>
        )}
      </div>

      <div className={styles.image}>
        <CarteQuestion
          intitule={null}
          image={
            // Avant la réponse, l'alt est générique : un alt qui nomme le mème donnerait la solution
            // aux lecteurs d'écran (voir le skill meme-data).
            <Image
              key={question.rang}
              src={question.image_url}
              alt={bonne ? `Image du mème « ${bonne.nom} »` : "Image d'un mème à identifier"}
              width={800}
              height={640}
              // Grand écran : colonne de gauche (7/12 de la feuille large, 820 px au plus).
              // Sinon : contenu de la feuille, au plus 560 px moins les marges intérieures (88 px).
              sizes="(min-width: 1024px) min(820px, calc((100vw - 280px) * 7 / 12)), min(560px, calc(100vw - 88px))"
              // Pas d'optimiseur : l'image vient d'une route privée (cookie de session, anti-triche) que
              // /_next/image ne peut ni appeler avec le cookie ni mettre en cache (SCRUM-112). La route sert
              // déjà du WebP.
              unoptimized
              priority
              className={styles.visuel}
            />
          }
        />
      </div>

      <h2 ref={titreQuestion} tabIndex={-1} className={styles.titre}>
        {retour ? "C'était…" : "C'est quel mème ?"}
      </h2>

      <div className={styles.reponses} aria-busy={envoi}>
        {question.choix.map((c, i) => (
          <BoutonReponse
            key={c.id_meme}
            lettre={LETTRES[i] ?? "A"}
            libelle={c.nom}
            etat={etatReponse(c.id_meme, correction)}
            onChoisir={() => void repondre(c.id_meme)}
          />
        ))}
      </div>

      <div className={styles.suite}>
        {!retour || !bonne ? (
          <p className={styles.astuce}>
            Astuce : touches A, B, C ou D pour répondre (quand le jeu a le focus).
          </p>
        ) : (
          <>
            <FicheMeme
              fiche={{
                nom: bonne.nom,
                origine: [
                  bonne.annee_origine ? `Vers ${bonne.annee_origine}` : "",
                  bonne.origine ?? "",
                ]
                  .filter(Boolean)
                  .join(" — "),
                description: "",
                source: "",
              }}
              credits={{
                auteur: bonne.auteur,
                licence: bonne.licence,
                sourceUrl: bonne.source_url,
              }}
              articleUrl={bonne.article_url}
            />
            <button
              ref={boutonSuivant}
              type="button"
              className={styles.suivante}
              onClick={suivante}
              aria-disabled={enAttenteSalle || undefined}
            >
              {derniere
                ? surFinSalle
                  ? "Voir le classement de la salle →"
                  : "Voir mon résultat →"
                : enAttenteSalle
                  ? "En attente des autres joueurs…"
                  : "Question suivante →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
