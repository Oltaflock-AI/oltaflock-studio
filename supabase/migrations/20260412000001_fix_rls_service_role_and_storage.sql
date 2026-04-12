-- Allow service role to update generations (for edge function callbacks)
-- Service role bypasses RLS by default in Supabase, but we add an explicit
-- policy for the anon/service key used by edge functions
CREATE POLICY "Service role can update all generations"
ON public.generations
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can read all generations"
ON public.generations
FOR SELECT
TO service_role
USING (true);

-- Add user_id index for efficient RLS filtering
CREATE INDEX IF NOT EXISTS idx_generations_user_id
ON public.generations(user_id);

-- Fix storage bucket policies: restrict uploads to user-owned paths
-- Drop the overly permissive upload policy
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;

-- Replace with user-scoped upload policy (files must be under user's own folder)
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generation-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix delete policy to be user-scoped too
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'generation-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
