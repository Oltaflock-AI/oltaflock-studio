-- Add progress column to generations table for per-job progress tracking
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;