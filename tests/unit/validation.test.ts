import { describe, expect, test } from "bun:test";

import {
  identifiantSchema,
  identifiantUrlSchema,
  nouvellePartieSchema,
  pseudoSchema,
  questionParamsSchema,
  reponseSchema,
} from "@/lib/validation";
import { CORPS_MAX_OCTETS, valider, validerCorpsJson } from "@/lib/validation-http";

describe("pseudoSchema", () => {
  test("accepte les pseudos du jeu et les nettoie", () => {
    for (const pseudo of ["Gribouille42", "Crayon_Fou", "Taille-crayon", "Saïd", "Règle_Plate"]) {
      expect(pseudoSchema.parse(pseudo)).toBe(pseudo);
    }
    expect(pseudoSchema.parse("  Jean   Dupont  ")).toBe("Jean Dupont");
    // « i » + tréma combinant devient le « ï » composé (NFC), donc accepté.
    expect(pseudoSchema.parse("Saïd")).toBe("Saïd");
  });

  test("refuse trop court, trop long, vide ou absent", () => {
    for (const pseudo of ["ab", "  a ", "", "a".repeat(21), undefined, null, 42]) {
      expect(pseudoSchema.safeParse(pseudo).success).toBe(false);
    }
    expect(pseudoSchema.safeParse("a".repeat(20)).success).toBe(true);
    // Uniquement de la ponctuation, ou des chiffres qui ne sont pas décimaux (exposants).
    for (const pseudo of ["...", "___", "- - -", "x²³"]) {
      expect(pseudoSchema.safeParse(pseudo).success).toBe(false);
    }
  });

  test("compte les caractères comme PostgreSQL, pas les unités UTF-16", () => {
    // 2 lettres hors plan de base = 4 unités UTF-16 mais 2 caractères : refusé comme `char_length`.
    expect(pseudoSchema.safeParse("𝒜𝒷").success).toBe(false);
    expect(pseudoSchema.safeParse("𝒜𝒷𝒸").success).toBe(true);
  });

  test("refuse le HTML, les caractères de contrôle et les symboles", () => {
    for (const pseudo of [
      "<script>x</script>",
      "a<b>c",
      "bob\u0000",
      "bob‮evil",
      "joueur😀",
      "a&b;c",
    ]) {
      expect(pseudoSchema.safeParse(pseudo).success).toBe(false);
    }
  });

  test("refuse les marques combinantes empilées (zalgo)", () => {
    expect(pseudoSchema.safeParse("b̃́̀̂ob").success).toBe(false);
  });
});

describe("identifiants", () => {
  test("nombre JSON : entier positif dans la plage d'un serial", () => {
    expect(identifiantSchema.parse(1)).toBe(1);
    expect(identifiantSchema.parse(2_147_483_647)).toBe(2_147_483_647);
    for (const valeur of [0, -1, 1.5, 2_147_483_648, "1", null, Number.NaN, Infinity]) {
      expect(identifiantSchema.safeParse(valeur).success).toBe(false);
    }
  });

  test("chaîne d'URL : chiffres seulement, sans zéro initial, sans notation scientifique", () => {
    expect(identifiantUrlSchema.parse("42")).toBe(42);
    for (const valeur of [
      "0",
      "-1",
      "007",
      "1e3",
      "0x10",
      " 1",
      "1 ",
      "1.0",
      "",
      "abc",
      "99999999999",
    ]) {
      expect(identifiantUrlSchema.safeParse(valeur).success).toBe(false);
    }
    expect(identifiantUrlSchema.safeParse("2147483648").success).toBe(false);
  });
});

describe("schémas d'API", () => {
  test("nouvellePartie : pseudo seul, aucun champ en plus", () => {
    expect(nouvellePartieSchema.parse({ pseudo: " Saïd " })).toEqual({ pseudo: "Saïd" });
    expect(nouvellePartieSchema.safeParse({ pseudo: "Saïd", score: 9999 }).success).toBe(false);
    expect(nouvellePartieSchema.safeParse({}).success).toBe(false);
  });

  test("questionParams : id_partie et rang de 1 à 10", () => {
    expect(questionParamsSchema.parse({ id_partie: "12", rang: "10" })).toEqual({
      id_partie: 12,
      rang: 10,
    });
    for (const rang of ["0", "11", "-1", "x", "1.5", "010"]) {
      expect(questionParamsSchema.safeParse({ id_partie: "1", rang }).success).toBe(false);
    }
  });

  test("réponse : refuse tout score ou délai envoyé par le client", () => {
    expect(reponseSchema.parse({ id_partie: 1, rang: 3, id_meme: 7 })).toEqual({
      id_partie: 1,
      rang: 3,
      id_meme: 7,
    });
    const triche = { id_partie: 1, rang: 3, id_meme: 7, points: 1000, delai_ms: 1 };
    expect(reponseSchema.safeParse(triche).success).toBe(false);
    expect(reponseSchema.safeParse({ id_partie: 1, rang: 11, id_meme: 7 }).success).toBe(false);
    expect(reponseSchema.safeParse({ id_partie: 1, rang: 3 }).success).toBe(false);
  });
});

describe("réponses HTTP (code 400)", () => {
  const requete = (corps: string) =>
    new Request("http://localhost/api/parties", { method: "POST", body: corps });

  test("entrée invalide : 400 avec le champ fautif, sans détail interne", async () => {
    const resultat = valider(nouvellePartieSchema, { pseudo: "a" });
    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.reponse.status).toBe(400);
    const corps = (await resultat.reponse.json()) as {
      erreur: string;
      details: { champ: string; message: string }[];
    };
    expect(corps.erreur).toBe("entree_invalide");
    expect(corps.details[0]?.champ).toBe("pseudo");
    expect(JSON.stringify(corps)).not.toContain("stack");
  });

  test("corps JSON valide : données nettoyées", async () => {
    const resultat = await validerCorpsJson(requete('{"pseudo":"  Saïd "}'), nouvellePartieSchema);
    expect(resultat).toEqual({ ok: true, donnees: { pseudo: "Saïd" } });
  });

  test("JSON mal formé ou vide : 400", async () => {
    for (const corps of ["{pseudo:", "", "undefined"]) {
      const resultat = await validerCorpsJson(requete(corps), nouvellePartieSchema);
      expect(resultat.ok).toBe(false);
      if (!resultat.ok) expect(resultat.reponse.status).toBe(400);
    }
  });

  test("JSON qui n'est pas un objet : 400", async () => {
    for (const corps of ["null", "[]", '"Saïd"', "42"]) {
      const resultat = await validerCorpsJson(requete(corps), nouvellePartieSchema);
      expect(resultat.ok).toBe(false);
      if (!resultat.ok) expect(resultat.reponse.status).toBe(400);
    }
  });

  test("Content-Length trop grand : 413 sans lire le corps", async () => {
    // Le corps réel est minuscule et valide : seul l'en-tête peut provoquer le refus.
    const requeteMenteuse = new Request("http://localhost/api/parties", {
      method: "POST",
      headers: { "content-length": "5000" },
      body: '{"pseudo":"Saïd"}',
    });
    expect(requeteMenteuse.headers.get("content-length")).toBe("5000");

    const resultat = await validerCorpsJson(requeteMenteuse, nouvellePartieSchema);
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.reponse.status).toBe(413);
  });

  test("gros corps avec Content-Length absent : 413 aussi", async () => {
    const gros = JSON.stringify({ pseudo: "Saïd", bourrage: "x".repeat(5_000) });
    const resultat = await validerCorpsJson(requete(gros), nouvellePartieSchema);
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.reponse.status).toBe(413);
  });

  test("corps streamé sans Content-Length : 413 et lecture interrompue tôt", async () => {
    const MORCEAUX = 200;
    let lus = 0;
    let annule = false;
    const flux = new ReadableStream<Uint8Array>({
      pull(controleur) {
        if (lus >= MORCEAUX) return controleur.close();
        lus += 1;
        controleur.enqueue(new TextEncoder().encode("x".repeat(500)));
      },
      cancel() {
        annule = true;
      },
    });
    const requeteStreamee = new Request("http://localhost/api/parties", {
      method: "POST",
      body: flux,
      duplex: "half",
    } as RequestInit);
    expect(requeteStreamee.headers.get("content-length")).toBeNull();

    const resultat = await validerCorpsJson(requeteStreamee, nouvellePartieSchema);
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.reponse.status).toBe(413);
    expect(annule).toBe(true);
    // 2000 octets / 500 par morceau : on s'arrête vers le 5e morceau, loin des 200 possibles.
    expect(lus).toBeLessThan(20);
  });

  test("corps à la limite exacte accepté, UTF-8 invalide refusé en 400", async () => {
    const limite = '{"pseudo":"Saïd","x":"' + "a".repeat(1_900) + '"}';
    expect(new TextEncoder().encode(limite).length).toBeLessThanOrEqual(CORPS_MAX_OCTETS);
    const ok = await validerCorpsJson(requete(limite), nouvellePartieSchema);
    expect(ok.ok).toBe(false); // clé « x » inconnue : refusée par strictObject, mais pas en 413
    if (!ok.ok) expect(ok.reponse.status).toBe(400);

    const invalide = new Request("http://localhost/api/parties", {
      method: "POST",
      body: new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]),
    });
    const refuse = await validerCorpsJson(invalide, nouvellePartieSchema);
    expect(refuse.ok).toBe(false);
    if (!refuse.ok) expect(refuse.reponse.status).toBe(400);
  });
});
