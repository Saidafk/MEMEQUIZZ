import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DUREE_SESSION_ADMIN_S,
  NOM_COOKIE_ADMIN,
  creerJetonAdmin,
  jetonAdminValide,
} from "@/lib/admin";

export async function estAdmin(): Promise<boolean> {
  const jeton = (await cookies()).get(NOM_COOKIE_ADMIN)?.value;
  return jetonAdminValide(jeton, process.env.ADMIN_PASSWORD);
}

// À appeler au début de chaque page et de chaque action d'administration : une action serveur
// est un point d'entrée public, elle ne doit jamais supposer que la page l'a déjà vérifié.
export async function exigerAdmin(): Promise<void> {
  if (!(await estAdmin())) redirect("/admin");
}

export async function ouvrirSessionAdmin(motDePasse: string): Promise<void> {
  (await cookies()).set(NOM_COOKIE_ADMIN, creerJetonAdmin(motDePasse), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: DUREE_SESSION_ADMIN_S,
  });
}

export async function fermerSessionAdmin(): Promise<void> {
  (await cookies()).delete(NOM_COOKIE_ADMIN);
}
