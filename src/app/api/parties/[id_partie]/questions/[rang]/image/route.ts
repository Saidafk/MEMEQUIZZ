import { readFile } from "node:fs/promises";

import { cookies } from "next/headers";

import { getDb } from "@/db";
import { reponseErreurQuestion, resoudreFichierImage, trouverImageQuestion } from "@/lib/questions";
import { NOM_COOKIE_SESSION, hasherJeton } from "@/lib/session";
import { questionParamsSchema } from "@/lib/validation";
import { valider } from "@/lib/validation-http";

// L'image passe par cette route plutôt que par /memes/<slug>.webp : le slug du mème est le nom
// de la bonne réponse et ne doit jamais apparaître dans ce que reçoit le navigateur.
export async function GET(
  _requete: Request,
  ctx: RouteContext<"/api/parties/[id_partie]/questions/[rang]/image">,
) {
  const params = valider(questionParamsSchema, await ctx.params);
  if (!params.ok) return params.reponse;

  const jeton = (await cookies()).get(NOM_COOKIE_SESSION)?.value;
  const resultat = await trouverImageQuestion(getDb(), {
    ...params.donnees,
    jetonHash: jeton ? hasherJeton(jeton) : null,
  });
  if (resultat.statut !== "ok") return reponseErreurQuestion(resultat);

  const fichier = resoudreFichierImage(resultat.chemin);
  if (!fichier) return Response.json({ erreur: "introuvable" }, { status: 404 });
  try {
    const octets = await readFile(fichier);
    return new Response(octets, {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=600" },
    });
  } catch {
    return Response.json({ erreur: "introuvable" }, { status: 404 });
  }
}
