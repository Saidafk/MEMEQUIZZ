import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const STATUTS_PARTIE = ["en_cours", "terminee", "abandonnee"] as const;
export const LICENCES_IMAGE = ["domaine_public", "cc0", "cc_by", "cc_by_sa"] as const;

export const statutPartie = pgEnum("statut_partie", STATUTS_PARTIE);
export const licenceImage = pgEnum("licence_image", LICENCES_IMAGE);

export const joueur = pgTable(
  "joueur",
  {
    id_joueur: serial("id_joueur").primaryKey(),
    pseudo: varchar("pseudo", { length: 20 }).notNull(),
    token_session_hash: varchar("token_session_hash", { length: 128 }).notNull().unique(),
    cree_le: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("joueur_pseudo_longueur_check", sql`char_length(${table.pseudo}) >= 3`)],
);

export const meme = pgTable(
  "meme",
  {
    id_meme: serial("id_meme").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    nom: varchar("nom", { length: 120 }).notNull(),
    annee_origine: integer("annee_origine"),
    origine: varchar("origine", { length: 500 }),
    source_url: varchar("source_url", { length: 500 }).notNull(),
    image_chemin: varchar("image_chemin", { length: 200 }).notNull(),
    auteur: varchar("auteur", { length: 200 }).notNull(),
    licence: licenceImage("licence").notNull(),
    actif: boolean("actif").notNull().default(true),
  },
  (table) => [index("meme_actif_idx").on(table.actif)],
);

export const partie = pgTable(
  "partie",
  {
    id_partie: serial("id_partie").primaryKey(),
    id_joueur: integer("id_joueur")
      .notNull()
      .references(() => joueur.id_joueur, { onDelete: "cascade" }),
    statut: statutPartie("statut").notNull().default("en_cours"),
    commence_le: timestamp("commence_le", { withTimezone: true }).notNull().defaultNow(),
    termine_le: timestamp("termine_le", { withTimezone: true }),
    score_total: integer("score_total").notNull().default(0),
  },
  (table) => [
    index("partie_score_total_idx").on(table.score_total),
    index("partie_id_joueur_idx").on(table.id_joueur),
    check("partie_score_total_check", sql`${table.score_total} >= 0`),
  ],
);

export const partieQuestion = pgTable(
  "partie_question",
  {
    id_partie: integer("id_partie")
      .notNull()
      .references(() => partie.id_partie, { onDelete: "cascade" }),
    rang: integer("rang").notNull(),
    id_meme: integer("id_meme")
      .notNull()
      .references(() => meme.id_meme, { onDelete: "restrict" }),
    // Remplis ensemble au premier accès à la question (4 choix tirés par le serveur, heure d'envoi
    // qui sert au calcul des points) : tant qu'elle n'a pas été servie, les deux sont NULL.
    choix_ids: jsonb("choix_ids").$type<number[]>(),
    envoye_le: timestamp("envoye_le", { withTimezone: true }),
    reponse_id_meme: integer("reponse_id_meme").references(() => meme.id_meme, {
      onDelete: "set null",
    }),
    repondu_le: timestamp("repondu_le", { withTimezone: true }),
    points: integer("points").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.id_partie, table.rang] }),
    index("partie_question_id_meme_idx").on(table.id_meme),
    index("partie_question_reponse_id_meme_idx").on(table.reponse_id_meme),
    check("partie_question_rang_check", sql`${table.rang} >= 1`),
    check(
      "partie_question_choix_check",
      sql`${table.choix_ids} is null or jsonb_array_length(${table.choix_ids}) = 4`,
    ),
    check(
      "partie_question_envoi_check",
      sql`(${table.choix_ids} is null) = (${table.envoye_le} is null)`,
    ),
    check("partie_question_points_check", sql`${table.points} >= 0`),
  ],
);

export type Joueur = typeof joueur.$inferSelect;
export type Meme = typeof meme.$inferSelect;
export type Partie = typeof partie.$inferSelect;
export type PartieQuestion = typeof partieQuestion.$inferSelect;
