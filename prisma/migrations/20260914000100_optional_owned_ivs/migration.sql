-- DropForeignKey
ALTER TABLE "Pokemon" DROP CONSTRAINT "Pokemon_ivId_fkey";

-- AlterTable
ALTER TABLE "Pokemon" ALTER COLUMN "ivId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PokemonType" ALTER COLUMN "icon" DROP NOT NULL;

-- CreateIndex
-- Older schemas allowed several Pokemon to share an IV row. Give each one
-- its own copy before enforcing ownership, preserving all existing values.
DO $$
DECLARE
  shared RECORD;
  copied_id INTEGER;
BEGIN
  FOR shared IN
    SELECT p."id", iv."attack", iv."defense", iv."hp"
    FROM "Pokemon" p
    JOIN "IV" iv ON iv."id" = p."ivId"
    WHERE p."id" <> (SELECT MIN(other."id") FROM "Pokemon" other WHERE other."ivId" = p."ivId")
  LOOP
    INSERT INTO "IV" ("attack", "defense", "hp")
    VALUES (shared."attack", shared."defense", shared."hp")
    RETURNING "id" INTO copied_id;
    UPDATE "Pokemon" SET "ivId" = copied_id WHERE "id" = shared."id";
  END LOOP;
END $$;

CREATE UNIQUE INDEX "Pokemon_ivId_key" ON "Pokemon"("ivId");

-- CreateIndex
CREATE INDEX "Pokemon_accountId_idx" ON "Pokemon"("accountId");

-- CreateIndex
CREATE INDEX "Pokemon_typeId_idx" ON "Pokemon"("typeId");

-- AddForeignKey
ALTER TABLE "Pokemon" ADD CONSTRAINT "Pokemon_ivId_fkey" FOREIGN KEY ("ivId") REFERENCES "IV"("id") ON DELETE SET NULL ON UPDATE CASCADE;
