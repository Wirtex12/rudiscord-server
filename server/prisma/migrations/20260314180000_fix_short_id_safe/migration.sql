-- AlterTable: Добавляем колонку, если её нет
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "shortId" TEXT;

-- Data Fix: Заполняем NULL значения случайными кодами
UPDATE "User" SET "shortId" = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0') WHERE "shortId" IS NULL;

-- Index: Удаляем старый индекс если есть, создаем новый
DROP INDEX IF EXISTS "User_shortId_key";
CREATE UNIQUE INDEX "User_shortId_key" ON "User"("shortId");

-- Constraint: Делаем поле обязательным
ALTER TABLE "User" ALTER COLUMN "shortId" SET NOT NULL;