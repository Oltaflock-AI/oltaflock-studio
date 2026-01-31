-- Add user_id column to generations table
ALTER TABLE public.generations
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to have a default user (will be NULL for old records)
-- New records will require user_id

-- Make user_id NOT NULL for new records (after backfill if needed)
-- For now, we'll allow NULL to preserve existing data but enforce via RLS

-- Enable Row Level Security
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user-scoped access
CREATE POLICY "Users can view their own generations"
ON public.generations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
ON public.generations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
ON public.generations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
ON public.generations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);