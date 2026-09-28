-- Prompt Assistant: interactive brief questions and suggested replies on assistant turns.
alter table public.assistant_messages
  add column if not exists questions jsonb,
  add column if not exists suggestions jsonb;
