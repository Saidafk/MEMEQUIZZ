import { getDb } from "@/db";
import { creerPartie } from "@/lib/parties";
import { reponseErreurQuestion } from "@/lib/questions";
import { cookieSession, genererJeton, hasherJeton } from "@/lib/session";
import { nouvellePartieSchema } from "@/lib/validation";
import { validerCorpsJson } from "@/lib/validation-http";

// Démarre une partie : crée le joueur anonyme et ses 10 questions, et pose le cookie de session
// (jeton aléatoire, seule son empreinte est en base).
export async function POST(requete: Request) {
  const corps = await validerCorpsJson(requete, nouvellePartieSchema);
  if (!corps.ok) return corps.reponse;

  const jeton = genererJeton();
  const resultat = await creerPartie(getDb(), {
    pseudo: corps.donnees.pseudo,
    jetonHash: hasherJeton(jeton),
  });
  if (resultat.statut !== "ok") return reponseErreurQuestion(resultat);

  return Response.json(
    { id_partie: resultat.id_partie, total: resultat.total },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": cookieSession(jeton, process.env.NODE_ENV === "production"),
      },
    },
  );
}
