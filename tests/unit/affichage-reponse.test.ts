import { describe, expect, test } from "bun:test";
import { detailCorrection, etatReponse } from "@/lib/affichage-reponse";

describe("etatReponse", () => {
  test("avant la correction, toutes les réponses restent jouables", () => {
    expect(etatReponse(1, null)).toBe("normal");
  });

  test("un mauvais choix est signalé avec la bonne réponse, les autres sont désactivés", () => {
    const correction = { choisi: 2, idBonne: 1 };
    expect(etatReponse(1, correction)).toBe("correct");
    expect(etatReponse(2, correction)).toBe("faux");
    expect(etatReponse(3, correction)).toBe("desactive");
  });

  test("un bon choix est affiché juste, jamais faux", () => {
    expect(etatReponse(1, { choisi: 1, idBonne: 1 })).toBe("correct");
  });

  test("temps écoulé : seule la bonne réponse est révélée, aucune n'est marquée fausse", () => {
    const correction = { choisi: null, idBonne: 1 };
    expect(etatReponse(1, correction)).toBe("correct");
    expect(etatReponse(2, correction)).toBe("desactive");
  });
});

describe("detailCorrection", () => {
  test("sans choix, le temps est écoulé", () => {
    expect(detailCorrection({ choisi: null, delaiMs: 15_000 })).toBe("temps écoulé");
  });

  test("une réponse jugée en retard par le serveur est annoncée « trop tard »", () => {
    expect(detailCorrection({ choisi: 1, enRetard: true, delaiMs: 16_000 })).toBe("trop tard");
  });

  test("une réponse dans les temps donne son délai", () => {
    expect(detailCorrection({ choisi: 1, delaiMs: 3_200 })).toBe("en 4 secondes");
  });
});
