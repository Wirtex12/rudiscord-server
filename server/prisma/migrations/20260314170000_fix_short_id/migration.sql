-- Safe migration: Add shortId column to User table
-- Uses IF NOT EXISTS to prevent errors on re-runs

-- Add column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'shortId'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "shortId" TEXT;
  END IF;
END $$;

-- Drop index if exists (before recreating)
DROP INDEX IF EXISTS "User_shortId_key";

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "User_shortId_key" ON "User"("shortId");
