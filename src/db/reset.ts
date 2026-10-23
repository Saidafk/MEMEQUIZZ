import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { semer } from "./seed";

// Recrée la base vide en une commande : supprime le schéma, rejoue les
// migrations puis le seed. Réservé à une base locale (données supprimées).
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL est manquante (voir .env.example)");
}
// Garde-fou : un tunnel SSH vers le VPS apparaîtrait aussi comme « localhost ».
// Ne jamais pointer DATABASE_URL vers une base de valeur en lançant ce script.
const { hostname } = new URL(url);
if (process.env.NODE_ENV === "production") {
  throw new Error("Refus de réinitialiser la base en production.");
}
if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
  throw new Error(`Refus de réinitialiser une base non locale (${hostname}).`);
}

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await client`DROP SCHEMA IF EXISTS public CASCADE`;
  await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  await client`CREATE SCHEMA public`;

  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" });
  const total = await semer(db);
  console.log(`Base réinitialisée : migrations rejouées, ${total} mèmes insérés.`);
} finally {
  await client.end();
}
