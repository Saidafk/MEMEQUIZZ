import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { BoutonLien } from "@/components/BoutonLien";
import { Feuille } from "@/components/Feuille";
import { LigneClassement } from "@/components/LigneClassement";
import { Podium } from "@/components/Podium";
import { getDb } from "@/db";
import { type Periode, lireClassement } from "@/lib/classement";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Classement — MEMEQUIZZ",
  description: "Les meilleurs scores du quiz de mèmes.",
};

// Le classement change à chaque partie terminée : il est lu à chaque requête, sous <Suspense>
// (Cache Components). Les pseudos sont des nœuds texte React : échappés, jamais interprétés comme du HTML.
async function Classement({ searchParams }: PageProps<"/classement">) {
  const periode: Periode = (await searchParams).periode === "toujours" ? "toujours" : "aujourdhui";
  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const lignes = await lireClassement(getDb(), {
    periode,
    jetonHash: jeton ? hasherJeton(jeton) : null,
  });
  const reste = lignes.slice(3);

  return (
    <>
      <nav aria-label="Période" className={styles.onglets}>
        <Link
          href="/classement"
          aria-current={periode === "aujourdhui" ? "page" : undefined}
          className={periode === "aujourdhui" ? styles.actif : styles.onglet}
        >
          Aujourd&apos;hui
        </Link>
        <Link
          href="/classement?periode=toujours"
          aria-current={periode === "toujours" ? "page" : undefined}
          className={periode === "toujours" ? styles.actif : styles.onglet}
        >
          Depuis toujours
        </Link>
      </nav>

      {lignes.length === 0 ? (
        <p role="status">
          {periode === "aujourdhui"
            ? "Aucune partie terminée aujourd'hui. Sois le premier !"
            : "Aucune partie terminée pour l'instant. Sois le premier !"}
        </p>
      ) : (
        <>
          <Podium joueurs={lignes.slice(0, 3)} />
          <ol className={styles.liste}>
            {reste.map((j, i) => (
              <LigneClassement
                key={`${j.rang}-${i}`}
                rang={j.rang}
                pseudo={j.pseudo}
                score={j.score}
                moi={j.moi}
              />
            ))}
          </ol>
        </>
      )}
    </>
  );
}

export default function PageClassement(props: PageProps<"/classement">) {
  return (
    <Feuille>
      <div className={styles.page}>
        <h1 className={styles.titre}>Classement</h1>
        <Suspense fallback={<p role="status">Chargement du classement…</p>}>
          <Classement {...props} />
        </Suspense>
        <BoutonLien href="/">Rejouer ↻</BoutonLien>
      </div>
    </Feuille>
  );
}
