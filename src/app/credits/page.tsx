import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Feuille } from "@/components/Feuille";
import { getDb } from "@/db";
import { imageAdaptee, libelleLicence } from "@/lib/licences";
import { listerMemes } from "@/lib/memes-admin";
import { metadonneesPage } from "@/lib/seo";
import styles from "./page.module.css";

export const metadata: Metadata = metadonneesPage({
  titre: "Crédits — MEMEQUIZZ",
  description: "Auteurs, licences et sources des images de mèmes utilisées dans le jeu.",
  chemin: "/credits",
});

async function Liste() {
  await connection();
  const memes = (await listerMemes(getDb())).filter((m) => m.actif);
  return (
    <ul className={styles.grille}>
      {memes.map((m) => (
        <li key={m.id_meme} className={styles.credit}>
          <strong className={styles.nom}>{m.nom}</strong>
          <span>Image de {m.auteur}</span>
          <span>
            {libelleLicence(m.licence)}
            {imageAdaptee(m.licence) ? ", réduite et convertie en WebP" : ""}
          </span>
          {m.source_url ? (
            <a href={m.source_url} target="_blank" rel="noopener noreferrer">
              Source
              <span className="masque-visuel">
                {" "}
                de {m.nom} (s&apos;ouvre dans un nouvel onglet)
              </span>
            </a>
          ) : (
            "Source non renseignée."
          )}
        </li>
      ))}
    </ul>
  );
}

export default function PageCredits() {
  return (
    <Feuille largeur="large" retour={{ href: "/", libelle: "Accueil" }}>
      <h1>Crédits des images</h1>
      <p>
        Les images sont copiées sur le serveur. La licence de chacune est indiquée ; « licence non
        vérifiée » signifie que ses droits n&apos;ont pas été contrôlés.
      </p>
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Liste />
      </Suspense>
    </Feuille>
  );
}
