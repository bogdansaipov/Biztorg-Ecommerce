ALTER TABLE "messages" DROP CONSTRAINT "messages_has_content";--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "type" SET DEFAULT 'DIRECT';--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_has_content" CHECK (
  ("messages"."type" = 'SYSTEM') OR
  ("messages"."content" IS NOT NULL OR "messages"."image_url" IS NOT NULL)
);