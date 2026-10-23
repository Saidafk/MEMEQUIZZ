import { getDb } from "@/db";
import {
  abonnementSchema,
  desabonnementSchema,
  enregistrerAbonnement,
  supprimerAbonnement,
} from "@/lib/push";
import { validerCorpsJson } from "@/lib/validation-http";

// L'abonnement n'est lié à aucun compte : il identifie seulement un appareil. Le corps doit être
// du JSON (`Content-Type: application/json`), ce qui écarte les envois de formulaires d'autres sites.
export async function POST(requete: Request) {
  const corps = await validerCorpsJson(requete, abonnementSchema);
  if (!corps.ok) return corps.reponse;
  await enregistrerAbonnement(getDb(), corps.donnees);
  return new Response(null, { status: 201 });
}

export async function DELETE(requete: Request) {
  const corps = await validerCorpsJson(requete, desabonnementSchema);
  if (!corps.ok) return corps.reponse;
  await supprimerAbonnement(getDb(), corps.donnees.endpoint);
  return new Response(null, { status: 204 });
}
