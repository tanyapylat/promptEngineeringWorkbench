-- Rename freeformText to comment in SpecVersion table
ALTER TABLE "SpecVersion" RENAME COLUMN "freeformText" TO "comment";
