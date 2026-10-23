import type { Metadata } from "next";
import Link from "next/link";
import { BoutonLien } from "@/components/BoutonLien";
import { Feuille } from "@/components/Feuille";
import { LigneClassement } from "@/components/LigneClassement";
import { Podium } from "@/components/Podium";
import { CLASSEMENT_DEMO, PSEUDO_DEMO } from "@/lib/donnees-demo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Classement — MEMEQUIZZ",
  description: "Les meilleurs scores du quiz de mèmes.",
};

export default function PageClassement() {
  const autres = CLASSEMENT_DEMO.slice(3);
  return (
    <Feuille>
      <div className={styles.page}>
        <h1 className={styles.titre}>Classement</h1>

        <nav aria-label="Période" className={styles.onglets}>
          <Link href="/classement" aria-current="page" className={styles.actif}>
            Aujourd&apos;hui
          </Link>
          <Link href="/classement" className={styles.onglet}>
            Depuis toujours
          </Link>
        </nav>

        <Podium joueurs={CLASSEMENT_DEMO} />

        <ol className={styles.liste} start={4}>
          {autres.map((j, i) => (
            <LigneClassement
              key={j.pseudo}
              rang={i + 4}
              pseudo={j.pseudo}
              score={j.score}
              moi={j.pseudo === PSEUDO_DEMO}
            />
          ))}
        </ol>

        <BoutonLien href="/jeu">Rejouer ↻</BoutonLien>
      </div>
    </Feuille>
  );
}
