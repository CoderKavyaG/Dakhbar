CREATE TABLE "SavedStory" ("user_id" TEXT NOT NULL, "story_id" TEXT NOT NULL, "include_in_brief" BOOLEAN NOT NULL DEFAULT false, "saved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SavedStory_pkey" PRIMARY KEY ("user_id","story_id"));
CREATE INDEX "SavedStory_user_id_include_in_brief_idx" ON "SavedStory"("user_id","include_in_brief");
ALTER TABLE "SavedStory" ADD CONSTRAINT "SavedStory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedStory" ADD CONSTRAINT "SavedStory_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
