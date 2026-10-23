import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Connexion créée au premier usage : `next build` charge les modules de route sans
// DATABASE_URL (image Docker), la lecture de la variable ne doit donc pas avoir lieu à l'import.
let instance: ReturnType<typeof creer> | undefined;

function creer() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL est manquante (voir .env.example)");
  }
  return drizzle(postgres(url), { schema });
}

export function getDb() {
  instance ??= creer();
  return instance;
}
