import type { z } from "zod";

// Aides pour les route handlers : toute entrée invalide devient une réponse 400 uniforme,
// sans jamais exposer d'erreur interne.
const CORPS_MAX_OCTETS = 2_000;

export type ResultatValidation<T> = { ok: true; donnees: T } | { ok: false; reponse: Response };

export function erreurValidation(erreur: z.ZodError): Response {
  return Response.json(
    {
      erreur: "entree_invalide",
      details: erreur.issues.map((probleme) => ({
        champ: probleme.path.join("."),
        message: probleme.message,
      })),
    },
    { status: 400 },
  );
}

export function valider<S extends z.ZodType>(
  schema: S,
  entree: unknown,
): ResultatValidation<z.output<S>> {
  const resultat = schema.safeParse(entree);
  if (resultat.success) return { ok: true, donnees: resultat.data };
  return { ok: false, reponse: erreurValidation(resultat.error) };
}

export async function validerCorpsJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<ResultatValidation<z.output<S>>> {
  const texte = await request.text();
  if (new TextEncoder().encode(texte).length > CORPS_MAX_OCTETS) {
    return { ok: false, reponse: Response.json({ erreur: "corps_trop_gros" }, { status: 413 }) };
  }

  let corps: unknown;
  try {
    corps = JSON.parse(texte);
  } catch {
    return {
      ok: false,
      reponse: Response.json({ erreur: "corps_json_invalide" }, { status: 400 }),
    };
  }
  return valider(schema, corps);
}
