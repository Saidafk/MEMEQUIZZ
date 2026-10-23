import { cookies } from "next/headers";

import { getDb } from "@/db";
import { reponseErreurQuestion, servirQuestion } from "@/lib/questions";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import { questionParamsSchema } from "@/lib/validation";
import { valider } from "@/lib/validation-http";

export async function GET(
  _requete: Request,
  ctx: RouteContext<"/api/parties/[id_partie]/questions/[rang]">,
) {
  const params = valider(questionParamsSchema, await ctx.params);
  if (!params.ok) return params.reponse;

  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const resultat = await servirQuestion(getDb(), {
    ...params.donnees,
    jetonHash: jeton ? hasherJeton(jeton) : null,
  });
  if (resultat.statut !== "ok") return reponseErreurQuestion(resultat);

  // no-store : le chrono est calculé côté serveur, une réponse en cache serait périmée.
  return Response.json(resultat.question, { headers: { "Cache-Control": "no-store" } });
}
