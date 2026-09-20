CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Following" (
    "user_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "followed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Following_pkey" PRIMARY KEY ("user_id", "entity_id")
);

CREATE TABLE "UserVisit" (
    "user_id" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "UserVisit_pkey" PRIMARY KEY ("user_id")
);

CREATE INDEX "Following_entity_id_idx" ON "Following"("entity_id");
CREATE INDEX "Following_user_id_followed_at_idx" ON "Following"("user_id", "followed_at");

ALTER TABLE "Following" ADD CONSTRAINT "Following_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Following" ADD CONSTRAINT "Following_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserVisit" ADD CONSTRAINT "UserVisit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
