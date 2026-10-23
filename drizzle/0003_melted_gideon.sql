CREATE TABLE "abonnement_push" (
	"id_abonnement" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"cle_p256dh" varchar(200) NOT NULL,
	"cle_auth" varchar(100) NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abonnement_push_endpoint_unique" UNIQUE("endpoint")
);
