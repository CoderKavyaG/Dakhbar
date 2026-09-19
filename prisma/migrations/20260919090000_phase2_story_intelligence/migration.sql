CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "EntityType" AS ENUM ('company', 'product', 'technology', 'language', 'framework', 'database', 'protocol', 'platform', 'tool');
CREATE TYPE "StoryStatus" AS ENUM ('active', 'review_needed', 'confirmed');

ALTER TABLE "RawDocument" ADD COLUMN "embedding" vector(384);

CREATE TABLE "Entity" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "EntityType" NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Story" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "StoryStatus" NOT NULL DEFAULT 'active',
  "significance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "possibly_related_to_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StoryDocument" (
  "story_id" TEXT NOT NULL,
  "raw_document_id" TEXT NOT NULL,
  "similarity_score" DOUBLE PRECISION NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryDocument_pkey" PRIMARY KEY ("story_id", "raw_document_id")
);
CREATE TABLE "StoryEntity" (
  "story_id" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  CONSTRAINT "StoryEntity_pkey" PRIMARY KEY ("story_id", "entity_id")
);

CREATE UNIQUE INDEX "Entity_name_key" ON "Entity"("name");
CREATE INDEX "Entity_name_trgm_idx" ON "Entity" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Story_updated_at_idx" ON "Story"("updated_at");
CREATE INDEX "Story_significance_score_idx" ON "Story"("significance_score");
CREATE INDEX "Story_title_search_idx" ON "Story" USING GIN (to_tsvector('english', "title"));
CREATE UNIQUE INDEX "StoryDocument_raw_document_id_key" ON "StoryDocument"("raw_document_id");
CREATE INDEX "StoryDocument_story_id_idx" ON "StoryDocument"("story_id");
CREATE INDEX "StoryEntity_entity_id_idx" ON "StoryEntity"("entity_id");

ALTER TABLE "Story" ADD CONSTRAINT "Story_possibly_related_to_id_fkey" FOREIGN KEY ("possibly_related_to_id") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoryDocument" ADD CONSTRAINT "StoryDocument_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryDocument" ADD CONSTRAINT "StoryDocument_raw_document_id_fkey" FOREIGN KEY ("raw_document_id") REFERENCES "RawDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryEntity" ADD CONSTRAINT "StoryEntity_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryEntity" ADD CONSTRAINT "StoryEntity_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
