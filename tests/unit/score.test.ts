import { describe, expect, test } from "bun:test";
import {
  DUREE_QUESTION_S,
  POINTS_MAX,
  POINTS_MIN_BONNE_REPONSE,
  calculerPoints,
} from "@/lib/score";

describe("calculerPoints", () => {
  test("une réponse fausse ne rapporte rien, même rapide", () => {
    expect(calculerPoints(false, DUREE_QUESTION_S)).toBe(0);
  });

  test("une réponse immédiate rapporte le maximum", () => {
    expect(calculerPoints(true, DUREE_QUESTION_S)).toBe(POINTS_MAX);
  });

  test("les points diminuent avec le temps écoulé", () => {
    expect(calculerPoints(true, 12)).toBeLessThan(calculerPoints(true, 13));
    expect(calculerPoints(true, 7)).toBe(Math.round((POINTS_MAX * 7) / DUREE_QUESTION_S));
  });

  test("une bonne réponse à la dernière seconde vaut au moins le minimum", () => {
    expect(calculerPoints(true, 1)).toBe(POINTS_MIN_BONNE_REPONSE);
    expect(calculerPoints(true, 0)).toBe(POINTS_MIN_BONNE_REPONSE);
  });

  test("ignore un temps restant hors bornes", () => {
    expect(calculerPoints(true, 999)).toBe(POINTS_MAX);
    expect(calculerPoints(true, -5)).toBe(POINTS_MIN_BONNE_REPONSE);
  });
});
