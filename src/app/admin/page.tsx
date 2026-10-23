import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Feuille } from "@/components/Feuille";
import { getDb } from "@/db";
import { estAdmin } from "@/lib/admin-session";
import { libelleLicence } from "@/lib/licences";
import { listerMemes } from "@/lib/memes-admin";
import { basculerActivation, deconnexion } from "./actions";
import styles from "./admin.module.css";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = {
  title: "Administration — MEMEQUIZZ",
  robots: { index: false },
};

async function Contenu({ searchParams }: PageProps<"/admin">) {
  await connection();
  if (!(await estAdmin())) {
    return (
      <>
        <h1>Administration</h1>
        <FormulaireConnexion />
      </>
    );
  }
  const memes = await listerMemes(getDb());
  const erreur = (await searchParams).erreur;
  return (
    <>
      <div className={styles.entete}>
        <h1>Mèmes ({memes.filter((m) => m.actif).length} actifs)</h1>
        <Link href="/admin/nouveau" className={styles.lien}>
          Ajouter un mème
        </Link>
        <form action={deconnexion}>
          <button type="submit" className={styles.action}>
            Se déconnecter
          </button>
        </form>
      </div>
      <p role="alert" className={styles.erreur}>
        {typeof erreur === "string" ? `✗ ${erreur}` : ""}
      </p>
      <ul className={styles.liste}>
        {memes.map((m) => (
          <li key={m.id_meme} className={`${styles.ligne} ${m.actif ? "" : styles.inactif}`}>
            <Image src={m.image_chemin} alt="" width={64} height={51} unoptimized />
            <span className={styles.nom}>
              {m.nom}
              <br />
              <small>
                {libelleLicence(m.licence)} · {m.auteur}
                {m.actif ? "" : " · désactivé"}
              </small>
            </span>
            <Link href={`/admin/${m.id_meme}`} className={styles.lien}>
              Modifier<span className="masque-visuel"> {m.nom}</span>
            </Link>
            <form action={basculerActivation.bind(null, m.id_meme, !m.actif)}>
              <button type="submit" className={styles.action}>
                {m.actif ? "Désactiver" : "Réactiver"}
                <span className="masque-visuel"> {m.nom}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PageAdmin(props: PageProps<"/admin">) {
  return (
    <Feuille largeur="large">
      <Suspense fallback={<p role="status">Chargement…</p>}>
        <Contenu {...props} />
      </Suspense>
    </Feuille>
  );
}
