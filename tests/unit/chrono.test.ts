import { describe, expect, test } from "bun:test";

import { echeance, libelleDelai, secondesRestantes } from "@/lib/chrono";
import { imageAdaptee, libelleLicence } from "@/lib/licences";

describe("secondesRestantes", () => {
  test("arrondit à la seconde supérieure et ne descend jamais sous zéro", () => {
    const fin = echeance(1_000, 15_000);
    expect(fin).toBe(16_000);
    expect(secondesRestantes(fin, 1_000)).toBe(15);
    expect(secondesRestantes(fin, 1_001)).toBe(15);
    // Il reste 14,001 s : on affiche 15 ; on passe à 14 pile quand il reste 14 s.
    expect(secondesRestantes(fin, 1_999)).toBe(15);
    expect(secondesRestantes(fin, 2_000)).toBe(14);
    expect(secondesRestantes(fin, 15_999)).toBe(1);
    expect(secondesRestantes(fin, 16_000)).toBe(0);
    expect(secondesRestantes(fin, 99_999)).toBe(0);
  });

  test("un temps restant négatif donne une échéance immédiate", () => {
    expect(echeance(5_000, -300)).toBe(5_000);
    expect(secondesRestantes(echeance(5_000, -300), 5_000)).toBe(0);
  });

  test("l'onglet en arrière-plan rattrape le temps réel", () => {
    // Aucun tick pendant 10 s : l'heure réelle donne quand même le bon temps restant.
    const fin = echeance(0, 15_000);
    expect(secondesRestantes(fin, 10_000)).toBe(5);
  });
});

describe("libelleDelai", () => {
  test("singulier, pluriel, et jamais « en 0 seconde »", () => {
    expect(libelleDelai(0)).toBe("en 1 seconde");
    expect(libelleDelai(400)).toBe("en 1 seconde");
    expect(libelleDelai(1_000)).toBe("en 1 seconde");
    expect(libelleDelai(1_001)).toBe("en 2 secondes");
    expect(libelleDelai(4_200)).toBe("en 5 secondes");
  });
});

describe("licences", () => {
  test("libellés lisibles, valeur inconnue renvoyée telle quelle", () => {
    expect(libelleLicence("cc_by_sa")).toBe("CC BY-SA");
    expect(libelleLicence("domaine_public")).toBe("domaine public");
    expect(libelleLicence("autre")).toBe("autre");
  });

  test("seules CC BY et CC BY-SA imposent de signaler l'adaptation", () => {
    expect(imageAdaptee("cc_by")).toBe(true);
    expect(imageAdaptee("cc_by_sa")).toBe(true);
    expect(imageAdaptee("cc0")).toBe(false);
    expect(imageAdaptee("domaine_public")).toBe(false);
  });
});
