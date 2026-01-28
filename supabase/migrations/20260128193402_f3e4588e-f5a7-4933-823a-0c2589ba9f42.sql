-- Create credit_logs table for balance tracking
CREATE TABLE public.credit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  balance TEXT NOT NULL,
  raw_response JSONB,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS needed for internal tool