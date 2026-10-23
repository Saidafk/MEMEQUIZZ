import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Feuille } from "@/components/Feuille";
import { exigerAdmin } from "@/lib/admin-session";
import { ajouterMeme } from "../actions";
import styles from "../admin.module.css";
import { FormulaireMeme } from "../FormulaireMeme";

export const metadata: Metadata = {
  title: "Ajouter un mème — MEMEQUIZZ",
  robots: { index: false },
};

async function Contenu() {
  await connection();
  await exigerAdmin();
  return (
    <>
      <h1>Ajouter un mème</h1>
      <p>
        Vérifie la licence sur la page Commons avant d&apos;ajouter (voir{" "}
        <code>docs/droits-images.md</code>).
      </p>
      <FormulaireMeme action={ajouterMeme} imageObligatoire />
      <Link href="/admin" className={styles.lien}>
        ← Retour à la liste
      </Link>
    </>
  );
}

export default function PageNouveauMeme() {
  return (
    <Feuille largeur="large">
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Feuille>
  );
}
