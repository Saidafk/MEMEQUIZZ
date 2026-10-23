import { redirect } from "next/navigation";

// Une partie a désormais un identifiant (/jeu/[partieId]) : l'ancienne adresse renvoie à l'accueil,
// où l'on saisit son pseudo pour en démarrer une.
export default function PageJeuSansPartie() {
  redirect("/");
}
