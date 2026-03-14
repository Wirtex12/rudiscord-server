-- AlterTable
ALTER TABLE "User" ADD COLUMN "shortId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_shortId_key" ON "User"("shortId");
