-- Safe migration: Add gender column to User table
-- Uses IF NOT EXISTS to prevent errors on re-runs

-- Add column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'gender'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "gender" TEXT;
  END IF;
END $$;
