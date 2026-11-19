import { cookies } from "next/headers";

import { getDb } from "@/db";
import { lancerSalle, reponseErreurSalle } from "@/lib/salles";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import { salleParamsSchema } from "@/lib/validation";
import { valider } from "@/lib/validation-http";

// L'hôte lance la partie (SCRUM-83) : la question 1 s'ouvre pour tous les joueurs de la salle.
// Pas de corps : la protection CSRF repose sur le jeton du proxy et le cookie SameSite=Strict.
export async function POST(_requete: Request, ctx: RouteContext<"/api/salles/[code]/lancement">) {
  const params = valider(salleParamsSchema, await ctx.params);
  if (!params.ok) return params.reponse;

  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const resultat = await lancerSalle(getDb(), {
    code: params.donnees.code,
    jetonHash: jeton ? hasherJeton(jeton) : null,
  });
  if (resultat.statut !== "ok") return reponseErreurSalle(resultat);
  return Response.json({ statut: "en_cours" }, { headers: { "Cache-Control": "no-store" } });
}
