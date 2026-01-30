-- Add display_name column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT;