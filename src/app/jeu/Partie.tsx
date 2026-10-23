"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BandeauResultat } from "@/components/BandeauResultat";
import { BarreScore } from "@/components/BarreScore";
import { BoutonReponse, type EtatReponse, type LettreReponse } from "@/components/BoutonReponse";
import { CarteQuestion } from "@/components/CarteQuestion";
import { Chrono, DUREE_QUESTION_S } from "@/components/Chrono";
import { FicheMeme } from "@/components/FicheMeme";
import { QUESTIONS_DEMO } from "@/lib/donnees-demo";
import styles from "./Partie.module.css";

const POINTS_MAX = 1000;
const POINTS_MIN_BONNE_REPONSE = 100;
const TOUCHES: Record<string, LettreReponse> = { a: "A", b: "B", c: "C", d: "D" };

type Phase = "question" | "retour";

// Partie de démonstration : les questions sont fictives et le score est calculé ici.
// En v0.3, la correction et le score passent côté serveur (voir donnees-demo.ts).
export function Partie() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [restant, setRestant] = useState(DUREE_QUESTION_S);
  const [choisie, setChoisie] = useState<LettreReponse | null>(null);
  const [gagne, setGagne] = useState(0);
  const [secondesMises, setSecondesMises] = useState(0);
  const [score, setScore] = useState(0);
  const restantRef = useRef(DUREE_QUESTION_S);
  const boutonSuivant = useRef<HTMLButtonElement>(null);

  const question = QUESTIONS_DEMO[index];
  const total = QUESTIONS_DEMO.length;

  const repondre = useCallback(
    (lettre: LettreReponse | null) => {
      const juste = lettre !== null && lettre === question?.bonneReponse;
      const points = juste
        ? Math.max(
            POINTS_MIN_BONNE_REPONSE,
            Math.round((POINTS_MAX * restantRef.current) / DUREE_QUESTION_S),
          )
        : 0;
      setChoisie(lettre);
      setSecondesMises(DUREE_QUESTION_S - restantRef.current);
      setGagne(points);
      setScore((s) => s + points);
      setPhase("retour");
    },
    [question],
  );

  // Décompte : une seconde par tick ; à zéro, la question est comptée comme ratée.
  useEffect(() => {
    if (phase !== "question") return;
    const id = setInterval(() => {
      restantRef.current -= 1;
      setRestant(restantRef.current);
      if (restantRef.current <= 0) repondre(null);
    }, 1000);
    return () => clearInterval(id);
  }, [phase, repondre]);

  // Clavier : touches A à D pour répondre.
  useEffect(() => {
    if (phase !== "question") return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const lettre = TOUCHES[e.key.toLowerCase()];
      if (lettre) repondre(lettre);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [phase, repondre]);

  // Au retour de réponse, le focus passe au bouton « suivante » (utilisateur clavier).
  useEffect(() => {
    if (phase === "retour") boutonSuivant.current?.focus();
  }, [phase]);

  if (!question) return null;

  function suivante() {
    if (index + 1 >= total) {
      router.push("/resultat/demo");
      return;
    }
    restantRef.current = DUREE_QUESTION_S;
    setRestant(DUREE_QUESTION_S);
    setChoisie(null);
    setGagne(0);
    setIndex(index + 1);
    setPhase("question");
  }

  const etatDe = (lettre: LettreReponse): EtatReponse => {
    if (phase === "question") return "normal";
    if (lettre === question.bonneReponse) return "correct";
    if (lettre === choisie) return "faux";
    return "desactive";
  };

  const reussi = choisie !== null && choisie === question.bonneReponse;
  const detail = choisie === null ? "temps écoulé" : `en ${secondesMises} secondes`;

  return (
    <div className={styles.partie}>
      <div className={styles.barre}>
        <BarreScore question={index + 1} totalQuestions={total} score={score} />
      </div>

      <div className={styles.etat}>
        {phase === "question" ? (
          <Chrono restant={restant} />
        ) : (
          <BandeauResultat reussi={reussi} points={gagne} detail={detail} />
        )}
      </div>

      <div className={styles.image}>
        <CarteQuestion intitule={null} />
      </div>

      <h2 className={styles.titre}>{phase === "question" ? "C'est quel mème ?" : "C'était…"}</h2>

      <div className={styles.reponses}>
        {question.choix.map((c) => (
          <BoutonReponse
            key={c.lettre}
            lettre={c.lettre}
            libelle={c.libelle}
            etat={etatDe(c.lettre)}
            onChoisir={repondre}
          />
        ))}
      </div>

      <div className={styles.suite}>
        {phase === "question" ? (
          <p className={styles.astuce}>Astuce : touches A, B, C ou D du clavier pour répondre.</p>
        ) : (
          <>
            <FicheMeme fiche={question.fiche} />
            <button
              ref={boutonSuivant}
              type="button"
              className={styles.suivante}
              onClick={suivante}
            >
              {index + 1 >= total ? "Voir mon résultat →" : "Question suivante →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
