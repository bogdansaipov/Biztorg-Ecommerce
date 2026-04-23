CREATE TYPE "public"."conversation_type" AS ENUM('DIRECT', 'GROUP', 'PUBLIC');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('NEW_MESSAGE', 'NEW_PRODUCT_POSTED', 'NEW_FOLLOWER', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."shop_member_role" AS ENUM('OWNER', 'ADMIN', 'EDITOR');--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "participant_role" DEFAULT 'MEMBER' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"last_read_message_id" uuid,
	"is_muted" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"following_user_id" uuid,
	"following_shop_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "follows_exactly_one_target" CHECK (
    ("follows"."following_user_id" IS NULL) <> ("follows"."following_shop_id" IS NULL)
  ),
	CONSTRAINT "follows_not_self_user" CHECK (
    "follows"."following_user_id" IS NULL OR "follows"."follower_id" <> "follows"."following_user_id"
  )
);
--> statement-breakpoint
CREATE TABLE "shop_members" (
	"shop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "shop_member_role" NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "shop_subscriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "shop_subscriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_one_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_two_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "receiver_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "type" "conversation_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "image_url" varchar(255);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_message_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "type" "message_type" DEFAULT 'TEXT' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reply_to_message_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shop_ratings" ADD COLUMN "comment" text;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_user_id_users_id_fk" FOREIGN KEY ("following_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_shop_id_shop_profiles_id_fk" FOREIGN KEY ("following_shop_id") REFERENCES "public"."shop_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_members" ADD CONSTRAINT "shop_members_shop_id_shop_profiles_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_members" ADD CONSTRAINT "shop_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_members" ADD CONSTRAINT "shop_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_participants_unique" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_user_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_convo_idx" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_user_unique" ON "follows" USING btree ("follower_id","following_user_id") WHERE "follows"."following_user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "follows_shop_unique" ON "follows" USING btree ("follower_id","following_shop_id") WHERE "follows"."following_shop_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "follows_following_user_idx" ON "follows" USING btree ("following_user_id");--> statement-breakpoint
CREATE INDEX "follows_following_shop_idx" ON "follows" USING btree ("following_shop_id");--> statement-breakpoint
CREATE INDEX "follows_follower_idx" ON "follows" USING btree ("follower_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_members_unique" ON "shop_members" USING btree ("shop_id","user_id");--> statement-breakpoint
CREATE INDEX "shop_members_user_idx" ON "shop_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shop_members_shop_idx" ON "shop_members" USING btree ("shop_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "conversations_type_idx" ON "conversations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_unique" ON "favorites" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "favorites_user_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_product_idx" ON "favorites" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "notifications_receiver_unread_idx" ON "notifications" USING btree ("receiver_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "notifications_expires_idx" ON "notifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notifications_product_idx" ON "notifications" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_region_idx" ON "products" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "products_user_idx" ON "products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "products_urgent_idx" ON "products" USING btree ("is_urgent");--> statement-breakpoint
CREATE INDEX "products_shop_idx" ON "products" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "profiles_user_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "regions_parent_idx" ON "regions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "shop_profiles_user_idx" ON "shop_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shop_profiles_verified_idx" ON "shop_profiles" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "shop_ratings_shop_idx" ON "shop_ratings" USING btree ("shop_profile_id");--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "user_one_id";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "user_two_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "message";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "read_at";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "has_been_seen";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "is_global";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "reference_id";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "shop_profiles" DROP COLUMN "is_online";--> statement-breakpoint
ALTER TABLE "shop_profiles" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "shop_profiles" DROP COLUMN "subscribers";--> statement-breakpoint
ALTER TABLE "shop_profiles" DROP COLUMN "total_reviews";--> statement-breakpoint
ALTER TABLE "shop_profiles" DROP COLUMN "views";--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_has_content" CHECK (
  ("messages"."type" = 'system') OR
  ("messages"."content" IS NOT NULL OR "messages"."image_url" IS NOT NULL)
);--> statement-breakpoint
ALTER TABLE "shop_ratings" ADD CONSTRAINT "shop_ratings_rating_range" CHECK ("shop_ratings"."rating" BETWEEN 1 AND 5);