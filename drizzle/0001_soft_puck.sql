ALTER TABLE "partie_question" ALTER COLUMN "choix_ids" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "partie_question" ALTER COLUMN "envoye_le" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "partie_question" ALTER COLUMN "envoye_le" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "partie_question" ADD CONSTRAINT "partie_question_choix_check" CHECK ("partie_question"."choix_ids" is null or jsonb_array_length("partie_question"."choix_ids") = 4);--> statement-breakpoint
ALTER TABLE "partie_question" ADD CONSTRAINT "partie_question_envoi_check" CHECK (("partie_question"."choix_ids" is null) = ("partie_question"."envoye_le" is null));