/*
  Warnings:

  - You are about to drop the column `freeformText` on the `SpecVersion` table. All the data in the column will be lost.
  - Added the required column `comment` to the `SpecVersion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SpecVersion" DROP COLUMN "freeformText",
ADD COLUMN     "comment" TEXT NOT NULL,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SpecVersion_projectId_isPinned_idx" ON "SpecVersion"("projectId", "isPinned");

-- CreateIndex
CREATE INDEX "SpecVersion_projectId_status_idx" ON "SpecVersion"("projectId", "status");
