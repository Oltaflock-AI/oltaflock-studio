

# Connect External Supabase & Create Generations Table

## Overview
Connect this Lovable app to your external Supabase project and create the `generations` table with your specified schema.

## Step 1: Update Supabase Credentials

Update the environment configuration to point to your external Supabase project:

| Variable | New Value |
|----------|-----------|
| `VITE_SUPABASE_URL` | `https://xynnkyipiwkvbavquypo.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_9tknUXQO-nUK6_mnyc2bxA_G7Zh0OCe` |
| `VITE_SUPABASE_PROJECT_ID` | `xynnkyipiwkvbavquypo` |

## Step 2: Create `generations` Table

Run the following SQL in your Supabase SQL Editor (Dashboard → SQL Editor):

```sql
-- Create the generations table
CREATE TABLE public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE NOT NULL,
  type text NOT NULL,
  model text NOT NULL,
  user_prompt text NOT NULL,
  final_prompt text,
  model_params jsonb,
  status text NOT NULL DEFAULT 'queued',
  output_url text,
  error text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add check constraint for type
ALTER TABLE public.generations 
ADD CONSTRAINT generations_type_check 
CHECK (type IN ('image', 'video'));

-- Add check constraint for status
ALTER TABLE public.generations 
ADD CONSTRAINT generations_status_check 
CHECK (status IN ('queued', 'running', 'done', 'error'));

-- Disable RLS (as requested for internal tool)
ALTER TABLE public.generations DISABLE ROW LEVEL SECURITY;

-- Grant access to anon and authenticated roles
GRANT ALL ON public.generations TO anon;
GRANT ALL ON public.generations TO authenticated;
```

## Files to Modify

| File | Action |
|------|--------|
| `.env` | Update Supabase URL, key, and project ID |

## Important Notes

1. **Existing Lovable Cloud**: The current Lovable Cloud connection will remain but won't be used once we update the credentials
2. **Manual SQL Required**: Since you're connecting to an external Supabase project, you'll need to run the SQL manually in your Supabase dashboard
3. **No RLS**: As requested, Row Level Security is disabled for this internal tool
4. **No Auth Changes**: Keeping setup simple with no authentication modifications

## What Happens After Approval

1. I will update the `.env` file with your Supabase credentials
2. You will run the provided SQL in your Supabase SQL Editor to create the table
3. The app will connect to your external Supabase project

