CREATE TYPE "public"."statut_salle" AS ENUM('attente', 'en_cours', 'terminee');--> statement-breakpoint
CREATE TABLE "salle" (
	"id_salle" serial PRIMARY KEY NOT NULL,
	"code" varchar(6) NOT NULL,
	"id_hote" integer NOT NULL,
	"statut" "statut_salle" DEFAULT 'attente' NOT NULL,
	"memes_ids" jsonb NOT NULL,
	"rang_courant" integer DEFAULT 0 NOT NULL,
	"question_ouverte_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"termine_le" timestamp with time zone,
	CONSTRAINT "salle_code_unique" UNIQUE("code"),
	CONSTRAINT "salle_code_check" CHECK ("salle"."code" ~ '^[A-Z0-9]{6}$'),
	CONSTRAINT "salle_memes_check" CHECK (jsonb_array_length("salle"."memes_ids") = 10),
	CONSTRAINT "salle_rang_check" CHECK ("salle"."rang_courant" between 0 and 10)
);
--> statement-breakpoint
ALTER TABLE "partie" ADD COLUMN "id_salle" integer;--> statement-breakpoint
ALTER TABLE "salle" ADD CONSTRAINT "salle_id_hote_joueur_id_joueur_fk" FOREIGN KEY ("id_hote") REFERENCES "public"."joueur"("id_joueur") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partie" ADD CONSTRAINT "partie_id_salle_salle_id_salle_fk" FOREIGN KEY ("id_salle") REFERENCES "public"."salle"("id_salle") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partie_id_salle_idx" ON "partie" USING btree ("id_salle");