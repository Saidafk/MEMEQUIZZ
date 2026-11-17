import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { dossierTemporaireSur } from "../integration/base-test";

// SCRUM-100 : le garde-fou doit refuser tout chemin qui pourrait désigner le projet.
describe("dossierTemporaireSur", () => {
  test("accepte un dossier temporaire au bon préfixe", () => {
    const chemin = join(tmpdir(), "memes-abc123");
    expect(dossierTemporaireSur(chemin, "memes-")).toBe(chemin);
  });

  test.each([
    ["chaîne vide (le cas de l'incident)", ""],
    ["dossier courant", "."],
    ["chemin relatif", "memes-abc"],
    ["dossier du projet", process.cwd()],
    ["dossier temporaire lui-même", tmpdir()],
    ["préfixe seul", join(tmpdir(), "memes-")],
    ["autre préfixe", join(tmpdir(), "autre-abc")],
    ["sous-dossier plus profond", join(tmpdir(), "x", "memes-abc")],
    ["remontée par ..", join(tmpdir(), "memes-abc", "..", "..")],
  ])("refuse : %s", (_, chemin) => {
    expect(() => dossierTemporaireSur(chemin, "memes-")).toThrow("Suppression refusée");
  });
});
