"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { motDePasseValide } from "@/lib/admin";
import { exigerAdmin, fermerSessionAdmin, ouvrirSessionAdmin } from "@/lib/admin-session";
import { changerActivation, creerMeme, modifierMeme } from "@/lib/memes-admin";
import { identifiantUrlSchema } from "@/lib/validation";

export type EtatFormulaire = { erreurs: string[] };

export async function connexion(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const saisi = formData.get("mot_de_passe");
  if (typeof saisi !== "string" || !motDePasseValide(saisi, process.env.ADMIN_PASSWORD)) {
    return { erreurs: ["Mot de passe incorrect."] };
  }
  await ouvrirSessionAdmin(saisi);
  redirect("/admin");
}

export async function deconnexion(): Promise<void> {
  await fermerSessionAdmin();
  redirect("/");
}

export async function ajouterMeme(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  await exigerAdmin();
  const resultat = await creerMeme(getDb(), formData);
  if (!resultat.ok) return { erreurs: resultat.erreurs };
  revalidatePath("/admin");
  redirect("/admin");
}

export async function editerMeme(
  id: number,
  _: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  await exigerAdmin();
  const identifiant = identifiantUrlSchema.safeParse(String(id));
  if (!identifiant.success) return { erreurs: ["Mème introuvable."] };
  const resultat = await modifierMeme(getDb(), identifiant.data, formData);
  if (!resultat.ok) return { erreurs: resultat.erreurs };
  revalidatePath("/admin");
  redirect("/admin");
}

export async function basculerActivation(id: number, actif: boolean): Promise<void> {
  await exigerAdmin();
  const identifiant = identifiantUrlSchema.safeParse(String(id));
  if (!identifiant.success) return;
  const resultat = await changerActivation(getDb(), identifiant.data, actif);
  // Refus (moins de 4 mèmes actifs) : on revient à la liste, l'état affiché reste celui de la base.
  if (!resultat.ok) redirect(`/admin?erreur=${encodeURIComponent(resultat.erreur)}`);
  revalidatePath("/admin");
  redirect("/admin");
}
