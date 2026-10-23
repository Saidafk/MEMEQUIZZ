import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "../../src/app/manifest";

describe("manifest PWA", () => {
  const m = manifest();

  test("remplit les critères d'installation", () => {
    expect(m.name).toBe("MEMEQUIZZ");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    const tailles = m.icons?.map((i) => i.sizes);
    expect(tailles).toContain("192x192");
    expect(tailles).toContain("512x512");
  });

  test("déclare une icône maskable", () => {
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });

  test("toutes les icônes existent dans public/", () => {
    for (const icone of m.icons ?? []) {
      expect(existsSync(join("public", icone.src))).toBe(true);
    }
  });
});
