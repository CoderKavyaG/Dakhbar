-- AlterTable
ALTER TABLE "SavedStory" DROP COLUMN "include_in_brief";

-- DropIndex
DROP INDEX IF EXISTS "SavedStory_user_id_include_in_brief_idx";

-- CreateIndex
CREATE INDEX "SavedStory_user_id_saved_at_idx" ON "SavedStory"("user_id", "saved_at");
