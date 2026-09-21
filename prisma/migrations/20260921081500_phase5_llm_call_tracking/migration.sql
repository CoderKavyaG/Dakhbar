CREATE TABLE "LlmCall" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "story_id" TEXT,
  "input_hash" TEXT,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "fallback_triggered" BOOLEAN NOT NULL DEFAULT false,
  "accepted" BOOLEAN NOT NULL DEFAULT false,
  "output_text" TEXT,
  "error_code" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LlmCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LlmCall_created_at_provider_model_idx" ON "LlmCall"("created_at", "provider", "model");
CREATE INDEX "LlmCall_story_id_input_hash_model_accepted_idx" ON "LlmCall"("story_id", "input_hash", "model", "accepted");
ALTER TABLE "LlmCall" ADD CONSTRAINT "LlmCall_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
