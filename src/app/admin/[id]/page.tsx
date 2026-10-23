import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Feuille } from "@/components/Feuille";
import { getDb } from "@/db";
import { exigerAdmin } from "@/lib/admin-session";
import { lireMeme } from "@/lib/memes-admin";
import { identifiantUrlSchema } from "@/lib/validation";
import { editerMeme } from "../actions";
import styles from "../admin.module.css";
import { FormulaireMeme } from "../FormulaireMeme";

export const metadata: Metadata = {
  title: "Modifier un mème — MEMEQUIZZ",
  robots: { index: false },
};

async function Contenu({ params }: PageProps<"/admin/[id]">) {
  await connection();
  await exigerAdmin();
  const id = identifiantUrlSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const ligne = await lireMeme(getDb(), id.data);
  if (!ligne) notFound();
  return (
    <>
      <h1>Modifier « {ligne.nom} »</h1>
      <FormulaireMeme
        action={editerMeme.bind(null, ligne.id_meme)}
        valeurs={ligne}
        imageObligatoire={false}
      />
      <Link href="/admin" className={styles.lien}>
        ← Retour à la liste
      </Link>
    </>
  );
}

export default function PageModifierMeme(props: PageProps<"/admin/[id]">) {
  return (
    <Feuille largeur="large">
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Contenu {...props} />
      </Suspense>
    </Feuille>
  );
}
