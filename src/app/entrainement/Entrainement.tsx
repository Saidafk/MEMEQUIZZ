"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BandeauResultat } from "@/components/BandeauResultat";
import { BarreScore } from "@/components/BarreScore";
import { BoutonReponse, type EtatReponse } from "@/components/BoutonReponse";
import { CarteQuestion } from "@/components/CarteQuestion";
import { Chrono } from "@/components/Chrono";
import { FicheMeme } from "@/components/FicheMeme";
import { echeance, libelleDelai, secondesRestantes } from "@/lib/chrono";
import type { QuestionEntrainement } from "@/lib/entrainement";
import { DUREE_QUESTION_S, calculerPoints } from "@/lib/score";
import type { LettreReponse } from "@/lib/types";
import styles from "../jeu/Partie.module.css";

const LETTRES: LettreReponse[] = ["A", "B", "C", "D"];

type Etat =
  | { phase: "chargement" }
  | { phase: "erreur"; message: string }
  | { phase: "question"; indice: number; fin: number }
  | { phase: "retour"; indice: number; choisi: number | null; points: number; delaiMs: number }
  | { phase: "fin" };

// Les images sont demandées dès la réception du lot pour que le service worker les garde : elles
// doivent être disponibles pour la partie suivante même sans réseau.
async function recupererLot(): Promise<QuestionEntrainement[] | null> {
  try {
    const reponse = await fetch("/api/entrainement");
    if (!reponse.ok) return null;
    const { questions } = (await reponse.json()) as { questions: QuestionEntrainement[] };
    for (const q of questions) void fetch(q.image_url).catch(() => {});
    return questions;
  } catch {
    return null;
  }
}
// Entraînement : le lot de questions vient de /api/entrainement (copie gardée par le service
// worker quand le réseau manque) et tout se joue dans le navigateur, sans score ni classement.
export function Entrainement() {
  const [questions, setQuestions] = useState<QuestionEntrainement[]>([]);
  const [etat, setEtat] = useState<Etat>({ phase: "chargement" });
  const [restant, setRestant] = useState(DUREE_QUESTION_S);
  const [score, setScore] = useState(0);
  const debut = useRef(0);
  const boutonSuivant = useRef<HTMLButtonElement>(null);
  const titreQuestion = useRef<HTMLHeadingElement>(null);

  const demarrer = useCallback((lot: QuestionEntrainement[] | null) => {
    if (!lot) {
      setEtat({
        phase: "erreur",
        message:
          "Les questions d'entraînement ne sont pas disponibles. Lance une première partie d'entraînement avec une connexion.",
      });
      return;
    }
    setQuestions(lot);
    debut.current = Date.now();
    setRestant(DUREE_QUESTION_S);
    setEtat({ phase: "question", indice: 0, fin: echeance(Date.now(), DUREE_QUESTION_S * 1000) });
  }, []);

  useEffect(() => {
    let annule = false;
    void recupererLot().then((lot) => {
      if (!annule) demarrer(lot);
    });
    return () => {
      annule = true;
    };
  }, [demarrer]);

  function rejouer() {
    setEtat({ phase: "chargement" });
    setScore(0);
    void recupererLot().then(demarrer);
  }
  const repondre = useCallback(
    (idMeme: number | null) => {
      if (etat.phase !== "question") return;
      const question = questions[etat.indice];
      if (!question) return;
      const juste = idMeme === question.bonne.id_meme;
      const delaiMs = Math.min(DUREE_QUESTION_S * 1000, Date.now() - debut.current);
      const points = calculerPoints(juste, secondesRestantes(etat.fin, Date.now()));
      setScore((s) => s + points);
      setEtat({ phase: "retour", indice: etat.indice, choisi: idMeme, points, delaiMs });
    },
    [etat, questions],
  );

  useEffect(() => {
    if (etat.phase !== "question") return;
    const { fin } = etat;
    const id = setInterval(() => {
      const secondes = secondesRestantes(fin, Date.now());
      setRestant(secondes);
      if (secondes <= 0) repondre(null);
    }, 250);
    return () => clearInterval(id);
  }, [etat, repondre]);

  const indiceAffiche = etat.phase === "question" || etat.phase === "retour" ? etat.indice : -1;
  useEffect(() => {
    if (etat.phase === "retour") boutonSuivant.current?.focus();
    else if (etat.phase === "question") titreQuestion.current?.focus({ preventScroll: true });
  }, [etat.phase, indiceAffiche]);

  function suivante() {
    if (etat.phase !== "retour") return;
    if (etat.indice + 1 >= questions.length) {
      setEtat({ phase: "fin" });
      return;
    }
    debut.current = Date.now();
    setRestant(DUREE_QUESTION_S);
    setEtat({
      phase: "question",
      indice: etat.indice + 1,
      fin: echeance(Date.now(), DUREE_QUESTION_S * 1000),
    });
  }

  if (etat.phase === "chargement") return <p role="status">Chargement de l&apos;entraînement…</p>;

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

  if (etat.phase === "fin") {
    return (
      <div className={styles.suite}>
        <h2 className={styles.titre}>Entraînement terminé</h2>
        <p role="status">
          Tu as marqué {score} pts sur {questions.length} questions. Ce score n&apos;est pas
          enregistré.
        </p>
        <button type="button" className={styles.suivante} onClick={rejouer}>
          Rejouer
        </button>
        <Link href="/" className={styles.suivante}>
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const question = questions[etat.indice];
  if (!question) return null;
  const retour = etat.phase === "retour" ? etat : null;
  const { bonne } = question;

  const etatDe = (idMeme: number): EtatReponse => {
    if (!retour) return "normal";
    if (idMeme === bonne.id_meme) return "correct";
    if (idMeme === retour.choisi) return "faux";
    return "desactive";
  };

  return (
    <div className={styles.partie}>
      <div className={styles.barre}>
        <BarreScore question={etat.indice + 1} totalQuestions={questions.length} score={score} />
      </div>

      <div className={styles.etat}>
        {!retour && <Chrono restant={restant} total={DUREE_QUESTION_S} />}
        <div role="status">
          {retour && (
            <BandeauResultat
              reussi={retour.choisi === bonne.id_meme}
              points={retour.points}
              detail={retour.choisi === null ? "temps écoulé" : libelleDelai(retour.delaiMs)}
            />
          )}
        </div>
      </div>

      <div className={styles.image}>
        <CarteQuestion
          intitule={null}
          image={
            <Image
              key={etat.indice}
              src={question.image_url}
              alt={retour ? `Image du mème « ${bonne.nom} »` : "Image d'un mème à identifier"}
              width={800}
              height={640}
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

      <div className={styles.reponses}>
        {question.choix.map((c, i) => (
          <BoutonReponse
            key={c.id_meme}
            lettre={LETTRES[i] ?? "A"}
            libelle={c.nom}
            etat={etatDe(c.id_meme)}
            onChoisir={() => repondre(c.id_meme)}
          />
        ))}
      </div>

      {retour && (
        <div className={styles.suite}>
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
            credits={{ auteur: bonne.auteur, licence: bonne.licence, sourceUrl: bonne.source_url }}
            articleUrl={bonne.article_url}
          />
          <button ref={boutonSuivant} type="button" className={styles.suivante} onClick={suivante}>
            {etat.indice + 1 >= questions.length ? "Voir mon score →" : "Question suivante →"}
          </button>
        </div>
      )}
    </div>
  );
}
