-- Prompt Assistant: saved chats, their messages, and the per-user memory the
-- assistant (and Prompt Brain) learn from. Everything is owner-only.

create table if not exists public.assistant_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  model_id text,
  backend text not null default 'kie' check (backend in ('kie', 'higgsfield')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assistant_chats_user_idx on public.assistant_chats (user_id, updated_at desc);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.assistant_chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  -- Prompt card written on this turn: { title, prompt, negative_prompt, settings, notes, model_id }
  card jsonb,
  -- Memory changes made on this turn: [{ action, id, category, content }]
  memory_events jsonb,
  -- Reference media the user attached: [{ url, kind }]
  attachments jsonb,
  -- Generations started from this message's card
  generation_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists assistant_messages_chat_idx on public.assistant_messages (chat_id, created_at);

create table if not exists public.assistant_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'style'
    check (category in ('about', 'style', 'brand', 'subject', 'technical', 'dislike', 'workflow')),
  content text not null check (char_length(btrim(content)) between 3 and 400),
  source text not null default 'chat' check (source in ('chat', 'reflection', 'manual')),
  source_chat_id uuid references public.assistant_chats(id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assistant_memories_user_idx on public.assistant_memories (user_id, pinned desc, updated_at desc);

alter table public.assistant_chats enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_memories enable row level security;

do $$
declare t text;
begin
  foreach t in array array['assistant_chats', 'assistant_messages', 'assistant_memories'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_own', t
    );
  end loop;
end $$;
