-- Create generations table for Lovable Cloud
CREATE TABLE IF NOT EXISTS public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE NOT NULL,
  type text NOT NULL,
  model text NOT NULL,
  user_prompt text NOT NULL,
  final_prompt text,
  model_params jsonb,
  status text NOT NULL DEFAULT 'queued',
  output_url text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add check constraints
ALTER TABLE public.generations 
ADD CONSTRAINT generations_type_check 
CHECK (type IN ('image', 'video'));

ALTER TABLE public.generations 
ADD CONSTRAINT generations_status_check 
CHECK (status IN ('queued', 'running', 'done', 'error'));

-- Disable RLS for internal tool
ALTER TABLE public.generations DISABLE ROW LEVEL SECURITY;