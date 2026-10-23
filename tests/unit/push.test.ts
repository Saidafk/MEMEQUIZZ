import { describe, expect, test } from "bun:test";

import { abonnementSchema, secretValide } from "@/lib/push";

const valide = { endpoint: "https://push.example.com/abc", keys: { p256dh: "cle", auth: "auth" } };

describe("abonnementSchema", () => {
  test("accepte un abonnement du navigateur", () => {
    expect(abonnementSchema.safeParse(valide).success).toBe(true);
  });

  test("refuse une adresse qui n'est pas en https", () => {
    expect(
      abonnementSchema.safeParse({ ...valide, endpoint: "http://push.example.com" }).success,
    ).toBe(false);
    expect(abonnementSchema.safeParse({ ...valide, endpoint: "javascript:alert(1)" }).success).toBe(
      false,
    );
  });

  test("refuse les clés manquantes et les champs inconnus", () => {
    expect(abonnementSchema.safeParse({ endpoint: valide.endpoint }).success).toBe(false);
    expect(abonnementSchema.safeParse({ ...valide, extra: 1 }).success).toBe(false);
  });
});

describe("secretValide", () => {
  test("accepte le bon secret en Bearer", () => {
    expect(secretValide("Bearer s3cret", "s3cret")).toBe(true);
  });

  test("refuse un mauvais secret, une absence d'en-tête ou de secret configuré", () => {
    expect(secretValide("Bearer autre", "s3cret")).toBe(false);
    expect(secretValide("s3cret", "s3cret")).toBe(false);
    expect(secretValide(null, "s3cret")).toBe(false);
    expect(secretValide("Bearer ", "")).toBe(false);
    expect(secretValide("Bearer x", undefined)).toBe(false);
  });
});
