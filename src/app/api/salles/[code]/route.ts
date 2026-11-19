import { cookies } from "next/headers";

import { getDb } from "@/db";
import { lireEtatSalle, reponseErreurSalle } from "@/lib/salles";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import { salleParamsSchema } from "@/lib/validation";
import { valider } from "@/lib/validation-http";

// État de la salle à un instant donné, pour ses membres seulement. Le suivi en direct passe par
// le flux SSE voisin (…/flux) ; cette route sert de repli et aux tests.
export async function GET(_requete: Request, ctx: RouteContext<"/api/salles/[code]">) {
  const params = valider(salleParamsSchema, await ctx.params);
  if (!params.ok) return params.reponse;

  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const resultat = await lireEtatSalle(getDb(), {
    code: params.donnees.code,
    jetonHash: jeton ? hasherJeton(jeton) : null,
  });
  if (resultat.statut !== "ok") return reponseErreurSalle(resultat);
  return Response.json(resultat.etat, { headers: { "Cache-Control": "no-store" } });
}
