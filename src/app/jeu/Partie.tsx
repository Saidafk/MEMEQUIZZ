"use client";

import { useRouter } from "next/navigation";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { BandeauResultat } from "@/components/BandeauResultat";
import { BarreScore } from "@/components/BarreScore";
import { BoutonReponse, type EtatReponse } from "@/components/BoutonReponse";
import { CarteQuestion } from "@/components/CarteQuestion";
import { Chrono } from "@/components/Chrono";
import { FicheMeme } from "@/components/FicheMeme";
import { QUESTIONS_DEMO } from "@/lib/donnees-demo";
import { DUREE_QUESTION_S, calculerPoints } from "@/lib/score";
import type { LettreReponse } from "@/lib/types";
import styles from "./Partie.module.css";

const TOUCHES: Record<string, LettreReponse> = { a: "A", b: "B", c: "C", d: "D" };

const PALIERS_ANNONCES_S = [10, 5];

type Phase = "question" | "retour";

const libelleSecondes = (n: number) => `${n} seconde${n > 1 ? "s" : ""}`;

// Partie de démonstration : les questions sont fictives et le score est calculé ici.
// En v0.3, la correction et le score passent côté serveur (voir donnees-demo.ts), et le
// temps est celui du serveur : le décompte par setInterval dérive quand l'onglet est en arrière-plan.
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
  const titreQuestion = useRef<HTMLHeadingElement>(null);

  const question = QUESTIONS_DEMO[index];
  const total = QUESTIONS_DEMO.length;

  const repondre = useCallback(
    (lettre: LettreReponse | null) => {
      const juste = lettre !== null && lettre === question?.bonneReponse;
      const points = calculerPoints(juste, restantRef.current);
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

  // Clavier : touches A à D pour répondre. Le raccourci n'est actif que lorsque le focus est
  // dans la zone de jeu (WCAG 2.1.4, raccourcis à une seule touche) : il ne gêne ni la
  // navigation d'un lecteur d'écran ni la saisie ailleurs dans la page.
  function surTouche(e: KeyboardEvent<HTMLDivElement>) {
    if (phase !== "question" || e.ctrlKey || e.metaKey || e.altKey) return;
    const lettre = TOUCHES[e.key.toLowerCase()];
    if (lettre) repondre(lettre);
  }

  // Gestion du focus (utilisateur clavier) : à l'arrivée et à chaque question, sur l'intitulé,
  // pour que les touches A à D fonctionnent tout de suite ; après une réponse, sur « suivante ».
  useEffect(() => {
    if (phase === "retour") boutonSuivant.current?.focus();
    else titreQuestion.current?.focus();
  }, [phase, index]);

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
  const detail = choisie === null ? "temps écoulé" : `en ${libelleSecondes(secondesMises)}`;

  return (
    <div className={styles.partie} onKeyDown={surTouche}>
      <div className={styles.barre}>
        <BarreScore question={index + 1} totalQuestions={total} score={score} />
      </div>

      <div className={styles.etat}>
        {phase === "question" && <Chrono restant={restant} />}
        {/* Le chrono n'est pas lu à chaque seconde : seuls les paliers sont annoncés. */}
        <div className="masque-visuel" aria-live="polite" aria-atomic="true">
          {phase === "question" && PALIERS_ANNONCES_S.includes(restant)
            ? `${libelleSecondes(restant)} restantes`
            : ""}
        </div>
        {/* Toujours monté : seul son contenu change, ce qui est annoncé de façon fiable. */}
        <div role="status">
          {phase === "retour" && <BandeauResultat reussi={reussi} points={gagne} detail={detail} />}
        </div>
      </div>

      <div className={styles.image}>
        <CarteQuestion intitule={null} />
      </div>

      <h2 ref={titreQuestion} tabIndex={-1} className={styles.titre}>
        {phase === "question" ? "C'est quel mème ?" : "C'était…"}
      </h2>

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
