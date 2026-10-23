import type { z } from "zod";

// Aides pour les route handlers : toute entrée invalide devient une réponse 400 uniforme,
// sans jamais exposer d'erreur interne.
export const CORPS_MAX_OCTETS = 2_000;

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

// Lit le corps par morceaux et coupe le flux dès que la limite est dépassée : `request.text()`
// chargerait tout en mémoire avant qu'on puisse mesurer, et `Content-Length` peut être absent
// (corps streamé) ou mensonger.
async function lireCorpsLimite(request: Request): Promise<string | "trop_gros" | "illisible"> {
  const annonce = Number(request.headers.get("content-length"));
  if (Number.isFinite(annonce) && annonce > CORPS_MAX_OCTETS) {
    await request.body?.cancel();
    return "trop_gros";
  }
  if (!request.body) return "";

  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > CORPS_MAX_OCTETS) {
      await lecteur.cancel();
      return "trop_gros";
    }
    morceaux.push(value);
  }

  const octets = new Uint8Array(total);
  let decalage = 0;
  for (const morceau of morceaux) {
    octets.set(morceau, decalage);
    decalage += morceau.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(octets);
  } catch {
    return "illisible";
  }
}

export async function validerCorpsJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<ResultatValidation<z.output<S>>> {
  // `application/json` exigé : un formulaire envoyé depuis un autre site ne peut pas produire ce
  // type sans demande d'autorisation préalable du navigateur (protection CSRF en plus du cookie SameSite).
  const typeContenu = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(typeContenu)) {
    await request.body?.cancel();
    return {
      ok: false,
      reponse: Response.json({ erreur: "type_contenu_non_supporte" }, { status: 415 }),
    };
  }

  const texte = await lireCorpsLimite(request);
  if (texte === "trop_gros") {
    return { ok: false, reponse: Response.json({ erreur: "corps_trop_gros" }, { status: 413 }) };
  }

  let corps: unknown;
  try {
    if (texte === "illisible") throw new Error("UTF-8 invalide");
    corps = JSON.parse(texte);
  } catch {
    return {
      ok: false,
      reponse: Response.json({ erreur: "corps_json_invalide" }, { status: 400 }),
    };
  }
  return valider(schema, corps);
}
