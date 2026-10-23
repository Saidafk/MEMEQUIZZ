import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LigneClassement } from "@/components/LigneClassement";
import { Podium } from "@/components/Podium";
import { attribuerRangs } from "@/lib/classement";

describe("attribuerRangs", () => {
  test("les égalités partagent le même rang (1, 2, 2, 4)", () => {
    const rangs = attribuerRangs([{ score: 900 }, { score: 700 }, { score: 700 }, { score: 500 }]);
    expect(rangs.map((r) => r.rang)).toEqual([1, 2, 2, 4]);
  });

  test("égalité en tête, liste vide, joueur seul", () => {
    expect(attribuerRangs([{ score: 5 }, { score: 5 }, { score: 1 }]).map((r) => r.rang)).toEqual([
      1, 1, 3,
    ]);
    expect(attribuerRangs([])).toEqual([]);
    expect(attribuerRangs([{ score: 0 }])).toEqual([{ score: 0, rang: 1 }]);
  });

  test("conserve les autres champs de chaque ligne", () => {
    expect(attribuerRangs([{ score: 3, pseudo: "A", moi: true }])).toEqual([
      { score: 3, pseudo: "A", moi: true, rang: 1 },
    ]);
  });
});

describe("pseudos échappés à l'affichage", () => {
  const piege = '<script>alert("x")</script><img src=x onerror=alert(1)>';

  test("LigneClassement : le HTML d'un pseudo est affiché comme du texte", () => {
    const html = renderToStaticMarkup(
      createElement(LigneClassement, { rang: 4, pseudo: piege, score: 120 }),
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  test("Podium : idem pour les trois premiers, et le vrai rang est annoncé", () => {
    const html = renderToStaticMarkup(
      createElement(Podium, {
        joueurs: [
          { pseudo: piege, score: 900, rang: 1 },
          { pseudo: "Bob", score: 900, rang: 1, moi: true },
          { pseudo: "Cléo", score: 100, rang: 3 },
        ],
      }),
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    // Égalité en tête : « 1er » deux fois puis « 3e ».
    expect(html.match(/1er : /g)?.length).toBe(2);
    expect(html).toContain("3e : ");
    expect(html).toContain("(toi)");
  });
});
