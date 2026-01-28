

# Switch to Lovable Cloud Database

## Overview
Simplify the application by switching from the external Supabase project to Lovable's built-in managed database, creating the `generations` table with the specified schema.

## Current State
- The app is currently configured to use an external Supabase project (credentials in `.env`)
- The `useGenerations` hook uses an untyped Supabase client (`supabase as any`) to bypass type-checking
- The Lovable Cloud database already has `jobs` and `profiles` tables (from `types.ts`)
- The `.env` currently points to `uqlzysrcsqcxxaxchufb` which is the Lovable Cloud project

## What Changes

### Step 1: Create `generations` Table in Lovable Cloud

Create a new database migration with the following schema:

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | Primary key, auto-generated |
| request_id | text | Unique, not null |
| type | text | Not null (image/video) |
| model | text | Not null |
| user_prompt | text | Not null |
| final_prompt | text | Nullable |
| model_params | jsonb | Nullable |
| status | text | Not null, default "queued" |
| output_url | text | Nullable |
| error_message | text | Nullable |
| created_at | timestamptz | Default now() |

RLS will be disabled for this internal tool.

### Step 2: Update `useGenerations` Hook

Modify the hook to:
- Use the properly typed Supabase client (once the table exists in Lovable Cloud)
- Rename `error` field to `error_message` to match the new schema
- Remove the untyped client workaround

### Step 3: Update GenerateButton Component

Update the `handleGenerate` function to:
- Insert new records with `status: "queued"` initially
- Use `error_message` instead of `error` field
- Properly capture and store any pipeline failures

### Step 4: Update RequestDetailPanel

Update to display `error_message` field instead of `error`.

## Files to Modify

| File | Action |
|------|--------|
| Database migration | Create `generations` table with new schema |
| `src/hooks/useGenerations.tsx` | Update to use typed client and new schema |
| `src/components/studio/GenerateButton.tsx` | Use `error_message` field |
| `src/components/studio/RequestDetailPanel.tsx` | Display `error_message` field |

## Technical Details

### Database Migration SQL

```text
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
```

### Hook Changes

The hook will be updated to:
- Use the typed Supabase client from `@/integrations/supabase/client`
- Map the `error_message` field correctly
- Interface `DbGeneration` will have `error_message` instead of `error`

### Error Handling Flow

When generation fails:
1. Catch the error in `handleGenerate`
2. Extract human-readable error message
3. Update record with `status: 'error'` and `error_message: '...'`

## What Stays the Same

- The UI components structure
- The generation store (`generationStore.ts`)
- The webhook integration to n8n
- The request/response flow
- All model configurations and types

## Important Notes

1. **Lovable Cloud**: The `.env` already points to Lovable Cloud (`uqlzysrcsqcxxaxchufb`), so no credential changes needed
2. **No Authentication**: As requested, no auth is added - this is for internal use
3. **Simple Setup**: No billing, prompt enhancement, or additional API calls
4. **Schema Update**: Changed `error` to `error_message` as per your specification

