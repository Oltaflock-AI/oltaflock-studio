-- Server-side credit charges for generations.
--
-- Before this, `generate` trusted the `cost_credits` the caller sent and the
-- success handlers deducted whatever `generations.model_params.cost_credits`
-- said, a column the user can write through RLS. Now:
--   * `generate` prices the job itself and calls reserve_generation_credits(),
--     which atomically (per-user lock) checks the optional daily cap, refuses a
--     second submit of the same generation row and records the charge.
--   * generation-callback / poll-tasks call settle_generation_charge(), which
--     charges or releases the reservation exactly once and decrements
--     user_credits in one UPDATE (no read-modify-write race).
-- Both tables are written only by the service role (edge functions).
--
-- Safe for existing users: no row in user_spend_limits means no cap, and
-- user_credits.balance stays a spend log (it is not enforced here, same as
-- before; the live kie.ai balance remains the hard stop for kie.ai models).

-- No foreign key to generations on purpose: users can delete their own
-- generation rows, and that must not erase today's spend from the cap.
create table if not exists public.generation_charges (
  generation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null,
  backend text not null default 'kie',
  credits numeric not null check (credits >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'charged', 'released')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists generation_charges_user_day_idx
  on public.generation_charges (user_id, created_at);

alter table public.generation_charges enable row level security;

drop policy if exists "Users can view their own charges" on public.generation_charges;
create policy "Users can view their own charges"
  on public.generation_charges for select to authenticated
  using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role writes charges.

-- Optional per-user daily cap, in Studio credits (1 credit = $0.005).
-- No row, or daily_credit_cap null, means no cap.
create table if not exists public.user_spend_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_credit_cap numeric check (daily_credit_cap is null or daily_credit_cap >= 0),
  note text,
  updated_at timestamptz not null default now()
);

alter table public.user_spend_limits enable row level security;

drop policy if exists "Users can view their own spend limit" on public.user_spend_limits;
create policy "Users can view their own spend limit"
  on public.user_spend_limits for select to authenticated
  using (auth.uid() = user_id);
-- Set by an admin (SQL editor / service role) only.

-- Reserve credits for one generation. Returns ok=false with a reason instead of
-- raising, so the edge function can answer with a clean 4xx.
create or replace function public.reserve_generation_credits(
  p_user_id uuid,
  p_generation_id uuid,
  p_model_id text,
  p_backend text,
  p_credits numeric
)
returns table (ok boolean, reason text, spent_today numeric, daily_cap numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap numeric;
  v_spent numeric;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  if p_credits is null or p_credits < 0 then
    return query select false, 'invalid_cost'::text, null::numeric, null::numeric;
    return;
  end if;

  -- Serialise every reservation of this user so two concurrent requests cannot
  -- both pass the cap check. Held until the transaction ends.
  perform pg_advisory_xact_lock(hashtextextended('generation_charges:' || p_user_id::text, 0));

  if not exists (
    select 1 from public.generations g
    where g.id = p_generation_id and g.user_id = p_user_id and g.status = 'queued'
  ) then
    return query select false, 'not_found'::text, null::numeric, null::numeric;
    return;
  end if;

  select l.daily_credit_cap into v_cap from public.user_spend_limits l where l.user_id = p_user_id;

  select coalesce(sum(c.credits), 0) into v_spent
  from public.generation_charges c
  where c.user_id = p_user_id and c.status in ('reserved', 'charged') and c.created_at >= v_day_start;

  if v_cap is not null and v_spent + p_credits > v_cap then
    return query select false, 'daily_cap'::text, v_spent, v_cap;
    return;
  end if;

  insert into public.generation_charges (generation_id, user_id, model_id, backend, credits)
  values (p_generation_id, p_user_id, p_model_id, coalesce(p_backend, 'kie'), p_credits)
  on conflict (generation_id) do nothing;

  if not found then
    return query select false, 'already_submitted'::text, v_spent, v_cap;
    return;
  end if;

  return query select true, null::text, v_spent + p_credits, v_cap;
end;
$$;

-- Settle a reservation exactly once. p_success=true charges it (decrements
-- user_credits and writes credit_logs); false releases it. Returns the credits
-- charged, 0 when nothing was charged (already settled, released, or no row).
create or replace function public.settle_generation_charge(p_generation_id uuid, p_success boolean)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_credits numeric;
  v_balance numeric;
  v_model text;
begin
  update public.generation_charges c
     set status = case when p_success then 'charged' else 'released' end,
         settled_at = now()
   where c.generation_id = p_generation_id and c.status = 'reserved'
  returning c.user_id, c.credits into v_user, v_credits;

  if v_user is null or not p_success or v_credits <= 0 then
    return 0;
  end if;

  update public.user_credits u
     set balance = greatest(0, u.balance - v_credits),
         total_spent = u.total_spent + v_credits,
         total_generations = u.total_generations + 1,
         updated_at = now()
   where u.user_id = v_user
  returning u.balance into v_balance;

  select g.model into v_model from public.generations g where g.id = p_generation_id;

  insert into public.credit_logs (user_id, balance, credits_used, generation_id, model, description, checked_at)
  values (v_user, coalesce(v_balance::text, 'n/a'), v_credits, p_generation_id, v_model,
          'Generation: ' || coalesce(v_model, 'unknown'), now());

  return v_credits;
end;
$$;

revoke all on function public.reserve_generation_credits(uuid, uuid, text, text, numeric) from public, anon, authenticated;
revoke all on function public.settle_generation_charge(uuid, boolean) from public, anon, authenticated;
grant execute on function public.reserve_generation_credits(uuid, uuid, text, text, numeric) to service_role;
grant execute on function public.settle_generation_charge(uuid, boolean) to service_role;
