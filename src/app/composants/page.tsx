import type { Metadata } from "next";
import { BarreScore } from "@/components/BarreScore";
import { BoutonReponse, type EtatReponse } from "@/components/BoutonReponse";
import { CarteQuestion } from "@/components/CarteQuestion";
import { Chrono } from "@/components/Chrono";
import styles from "./page.module.css";

// Planche de contrôle des composants, à comparer à docs/maquette/maquette-composants.svg.
export const metadata: Metadata = {
  title: "Composants — MEMEQUIZZ",
  robots: { index: false },
};

const ETATS: { etat: EtatReponse; nom: string }[] = [
  { etat: "normal", nom: "normal" },
  { etat: "correct", nom: "bonne réponse" },
  { etat: "faux", nom: "mauvaise réponse" },
  { etat: "desactive", nom: "désactivé" },
];

export default function PageComposants() {
  return (
    <main className={styles.page}>
      <h1>Composants</h1>

      <section className={styles.section}>
        <h2>Bouton de réponse — états</h2>
        <p>Le focus clavier se voit avec la touche Tab.</p>
        <div className={styles.grilleEtats}>
          {ETATS.map(({ etat, nom }) => (
            <figure key={etat} className={styles.etat}>
              <BoutonReponse lettre="B" libelle="Réponse" etat={etat} />
              <figcaption>{nom}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Chrono et score</h2>
        <Chrono restant={11} />
        <Chrono restant={4} />
        <BarreScore question={3} totalQuestions={10} score={1250} />
      </section>

      <section className={styles.section}>
        <h2>Écran question (mobile)</h2>
        <div className={styles.mobile}>
          <BarreScore question={3} totalQuestions={10} score={1250} />
          <Chrono restant={11} />
          <CarteQuestion />
          <div className={styles.grilleReponses}>
            <BoutonReponse lettre="A" libelle="Le chat surpris" />
            <BoutonReponse lettre="B" libelle="Le gars qui hésite" />
            <BoutonReponse lettre="C" libelle="Tout va bien" />
            <BoutonReponse lettre="D" libelle="Le pouce levé" />
          </div>
        </div>
      </section>
    </main>
  );
}
