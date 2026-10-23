CREATE TYPE "public"."licence_image" AS ENUM('domaine_public', 'cc0', 'cc_by', 'cc_by_sa');--> statement-breakpoint
CREATE TYPE "public"."statut_partie" AS ENUM('en_cours', 'terminee', 'abandonnee');--> statement-breakpoint
CREATE TABLE "joueur" (
	"id_joueur" serial PRIMARY KEY NOT NULL,
	"pseudo" varchar(20) NOT NULL,
	"token_session_hash" varchar(128) NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meme" (
	"id_meme" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"nom" varchar(120) NOT NULL,
	"annee_origine" integer,
	"origine" varchar(500),
	"source_url" varchar(500) NOT NULL,
	"image_chemin" varchar(200) NOT NULL,
	"auteur" varchar(200) NOT NULL,
	"licence" "licence_image" NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "meme_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "partie" (
	"id_partie" serial PRIMARY KEY NOT NULL,
	"id_joueur" integer NOT NULL,
	"statut" "statut_partie" DEFAULT 'en_cours' NOT NULL,
	"commence_le" timestamp with time zone DEFAULT now() NOT NULL,
	"termine_le" timestamp with time zone,
	"score_total" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partie_question" (
	"id_partie" integer NOT NULL,
	"rang" integer NOT NULL,
	"id_meme" integer NOT NULL,
	"choix_ids" jsonb NOT NULL,
	"envoye_le" timestamp with time zone DEFAULT now() NOT NULL,
	"reponse_id_meme" integer,
	"repondu_le" timestamp with time zone,
	"points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "partie_question_id_partie_rang_pk" PRIMARY KEY("id_partie","rang")
);
--> statement-breakpoint
ALTER TABLE "partie" ADD CONSTRAINT "partie_id_joueur_joueur_id_joueur_fk" FOREIGN KEY ("id_joueur") REFERENCES "public"."joueur"("id_joueur") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partie_question" ADD CONSTRAINT "partie_question_id_partie_partie_id_partie_fk" FOREIGN KEY ("id_partie") REFERENCES "public"."partie"("id_partie") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partie_question" ADD CONSTRAINT "partie_question_id_meme_meme_id_meme_fk" FOREIGN KEY ("id_meme") REFERENCES "public"."meme"("id_meme") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partie_question" ADD CONSTRAINT "partie_question_reponse_id_meme_meme_id_meme_fk" FOREIGN KEY ("reponse_id_meme") REFERENCES "public"."meme"("id_meme") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meme_actif_idx" ON "meme" USING btree ("actif");--> statement-breakpoint
CREATE INDEX "partie_score_total_idx" ON "partie" USING btree ("score_total");--> statement-breakpoint
CREATE INDEX "partie_id_joueur_idx" ON "partie" USING btree ("id_joueur");