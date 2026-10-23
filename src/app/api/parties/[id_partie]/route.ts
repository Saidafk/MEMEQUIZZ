import { cookies } from "next/headers";

import { getDb } from "@/db";
import { lireResultat } from "@/lib/parties";
import { reponseErreurQuestion } from "@/lib/questions";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import { partieParamsSchema } from "@/lib/validation";
import { valider } from "@/lib/validation-http";

// État et résultat d'une partie, pour son propriétaire seulement.
export async function GET(_requete: Request, ctx: RouteContext<"/api/parties/[id_partie]">) {
  const params = valider(partieParamsSchema, await ctx.params);
  if (!params.ok) return params.reponse;

  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const resultat = await lireResultat(getDb(), {
    id_partie: params.donnees.id_partie,
    jetonHash: jeton ? hasherJeton(jeton) : null,
  });
  if (resultat.statut !== "ok") return reponseErreurQuestion(resultat);

  return Response.json(resultat.resultat, { headers: { "Cache-Control": "no-store" } });
}
