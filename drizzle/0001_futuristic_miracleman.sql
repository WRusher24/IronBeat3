CREATE TABLE "stream_sources" (
	"video_id" text PRIMARY KEY NOT NULL,
	"sources" jsonb NOT NULL,
	"title" text,
	"artist" text,
	"duration" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "stream_sources_expiry_idx" ON "stream_sources" USING btree ("expires_at");