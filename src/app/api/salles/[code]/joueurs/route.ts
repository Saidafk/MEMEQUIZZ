import { getDb } from "@/db";
import { rejoindreSalle, reponseErreurSalle } from "@/lib/salles";
import { cookieSession, genererJeton, hasherJeton } from "@/lib/session";
import { pseudoSalleSchema, salleParamsSchema } from "@/lib/validation";
import { valider, validerCorpsJson } from "@/lib/validation-http";

// Rejoindre une salle avec son code (SCRUM-83), tant que l'hôte ne l'a pas lancée.
export async function POST(requete: Request, ctx: RouteContext<"/api/salles/[code]/joueurs">) {
  const params = valider(salleParamsSchema, await ctx.params);
  if (!params.ok) return params.reponse;
  const corps = await validerCorpsJson(requete, pseudoSalleSchema);
  if (!corps.ok) return corps.reponse;

  const jeton = genererJeton();
  const resultat = await rejoindreSalle(getDb(), {
    code: params.donnees.code,
    pseudo: corps.donnees.pseudo,
    jetonHash: hasherJeton(jeton),
  });
  if (resultat.statut !== "ok") return reponseErreurSalle(resultat);

  return Response.json(
    { code: resultat.code, id_partie: resultat.id_partie },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": cookieSession(jeton, process.env.NODE_ENV === "production"),
      },
    },
  );
}
