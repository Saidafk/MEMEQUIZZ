import { describe, expect, test } from "bun:test";

import { creerJetonAdmin, jetonAdminValide, motDePasseValide } from "@/lib/admin";
import { creerSlug, ficheMemeSchema } from "@/lib/memes-admin";

const MDP = "un-mot-de-passe-solide";

describe("session administrateur", () => {
  test("un jeton fraîchement créé est valide", () => {
    expect(jetonAdminValide(creerJetonAdmin(MDP), MDP)).toBe(true);
  });

  test("refuse un jeton expiré, falsifié, vide ou signé avec un autre mot de passe", () => {
    const jeton = creerJetonAdmin(MDP, Date.now() - 9 * 3600 * 1000);
    expect(jetonAdminValide(jeton, MDP)).toBe(false);
    const [exp, signature] = creerJetonAdmin(MDP).split(".");
    expect(jetonAdminValide(`${Number(exp) + 99999}.${signature}`, MDP)).toBe(false);
    expect(jetonAdminValide(undefined, MDP)).toBe(false);
    expect(jetonAdminValide("n.importe.quoi", MDP)).toBe(false);
    expect(jetonAdminValide(creerJetonAdmin("autre-mot-de-passe-1"), MDP)).toBe(false);
  });

  test("sans mot de passe configuré (ou trop court), l'accès reste fermé", () => {
    expect(jetonAdminValide(creerJetonAdmin(MDP), undefined)).toBe(false);
    expect(jetonAdminValide(creerJetonAdmin("court"), "court")).toBe(false);
    expect(motDePasseValide("court", "court")).toBe(false);
    expect(motDePasseValide(MDP, undefined)).toBe(false);
  });

  test("compare le mot de passe saisi", () => {
    expect(motDePasseValide(MDP, MDP)).toBe(true);
    expect(motDePasseValide("autre", MDP)).toBe(false);
  });
});

describe("creerSlug", () => {
  test("retire accents et ponctuation", () => {
    expect(creerSlug("Gars qui hésite !")).toBe("gars-qui-hesite");
    expect(creerSlug("  Ça va très bien  ")).toBe("ca-va-tres-bien");
  });

  test("ne produit rien si le nom n'a ni lettre ni chiffre", () => {
    expect(creerSlug("!!!")).toBe("");
  });

  test("tient dans 80 caractères sans tiret final", () => {
    const slug = creerSlug("a".repeat(79) + " b");
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("ficheMemeSchema", () => {
  const valide = {
    nom: "Doge",
    annee_origine: "2013",
    origine: "",
    auteur: "Atsuko Sato",
    licence: "cc_by",
    source_url: "https://commons.wikimedia.org/wiki/File:Doge.jpg",
    article_url: "",
  };

  test("accepte une fiche valide et transforme les champs vides en null", () => {
    const r = ficheMemeSchema.safeParse(valide);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.annee_origine).toBe(2013);
      expect(r.data.origine).toBeNull();
      expect(r.data.article_url).toBeNull();
    }
  });

  test("refuse une licence non libre ou absente", () => {
    expect(ficheMemeSchema.safeParse({ ...valide, licence: "tous_droits_reserves" }).success).toBe(
      false,
    );
    expect(ficheMemeSchema.safeParse({ ...valide, licence: "" }).success).toBe(false);
  });

  test("refuse un auteur vide", () => {
    expect(ficheMemeSchema.safeParse({ ...valide, auteur: "   " }).success).toBe(false);
  });

  test("n'accepte que des liens https, l'article sur wikipedia.org", () => {
    expect(
      ficheMemeSchema.safeParse({ ...valide, source_url: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(
      ficheMemeSchema.safeParse({ ...valide, source_url: "http://commons.wikimedia.org/x" })
        .success,
    ).toBe(false);
    expect(
      ficheMemeSchema.safeParse({ ...valide, article_url: "https://exemple.com/x" }).success,
    ).toBe(false);
    expect(
      ficheMemeSchema.safeParse({ ...valide, article_url: "https://fr.wikipedia.org/wiki/Doge" })
        .success,
    ).toBe(true);
  });
});
