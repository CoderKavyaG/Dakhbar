CREATE TABLE "EntityMetricSnapshot" (
    "entity_id" TEXT NOT NULL,
    "snapshot_at" TIMESTAMPTZ(3) NOT NULL,
    "mention_count" INTEGER NOT NULL DEFAULT 0,
    "unique_source_count" INTEGER NOT NULL DEFAULT 0,
    "discussion_count" INTEGER NOT NULL DEFAULT 0,
    "mention_velocity" DOUBLE PRECISION,
    CONSTRAINT "EntityMetricSnapshot_pkey" PRIMARY KEY ("entity_id", "snapshot_at")
);
CREATE INDEX "EntityMetricSnapshot_snapshot_at_mention_velocity_idx"
  ON "EntityMetricSnapshot"("snapshot_at", "mention_velocity");
ALTER TABLE "EntityMetricSnapshot"
  ADD CONSTRAINT "EntityMetricSnapshot_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "Entity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
