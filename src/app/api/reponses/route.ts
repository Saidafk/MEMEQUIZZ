import { cookies } from "next/headers";

import { getDb } from "@/db";
import { reponseErreurQuestion } from "@/lib/questions";
import { enregistrerReponse } from "@/lib/reponses";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import { reponseSchema } from "@/lib/validation";
import { validerCorpsJson } from "@/lib/validation-http";

// Le cookie de session est posé en SameSite par SCRUM-42 ; combiné à l'exigence de
// `Content-Type: application/json`, une page d'un autre site ne peut pas répondre à la place du joueur.
export async function POST(requete: Request) {
  const corps = await validerCorpsJson(requete, reponseSchema);
  if (!corps.ok) return corps.reponse;

  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const resultat = await enregistrerReponse(getDb(), {
    ...corps.donnees,
    jetonHash: jeton ? hasherJeton(jeton) : null,
  });
  if (resultat.statut !== "ok") return reponseErreurQuestion(resultat);

  return Response.json(resultat.correction, { headers: { "Cache-Control": "no-store" } });
}
