-- Assertions for migration 20261106120000_server_side_credit_charges.sql.
-- Run through scripts/credit-charges/run.sh (throwaway local Postgres only).
\set ON_ERROR_STOP on
set role service_role;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.user_credits (user_id, balance) values
  ('00000000-0000-0000-0000-00000000000a', 100), ('00000000-0000-0000-0000-00000000000b', 100);
insert into public.generations (id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');

do $$
declare r record; v numeric;
begin
  -- 1. No cap row: reservation succeeds (existing users unaffected).
  select * into r from reserve_generation_credits('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'm', 'kie', 6);
  assert r.ok and r.daily_cap is null, 'no-cap reserve should pass';

  -- 2. Same generation again: refused, no second charge.
  select * into r from reserve_generation_credits('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'm', 'kie', 6);
  assert not r.ok and r.reason = 'already_submitted', 'replay must be refused, got ' || coalesce(r.reason, 'ok');

  -- 3. Someone else's generation: refused.
  select * into r from reserve_generation_credits('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', 'm', 'kie', 1);
  assert not r.ok and r.reason = 'not_found', 'foreign row must be refused';

  -- 4. Negative cost: refused.
  select * into r from reserve_generation_credits('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002', 'm', 'kie', -1);
  assert not r.ok and r.reason = 'invalid_cost', 'negative cost must be refused';

  -- 5. Daily cap of 10 with 6 already reserved: a further 6 is refused, 4 fits.
  insert into user_spend_limits (user_id, daily_credit_cap) values ('00000000-0000-0000-0000-00000000000a', 10);
  select * into r from reserve_generation_credits('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002', 'm', 'kie', 6);
  assert not r.ok and r.reason = 'daily_cap' and r.spent_today = 6 and r.daily_cap = 10, 'cap must block';
  select * into r from reserve_generation_credits('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002', 'm', 'kie', 4);
  assert r.ok and r.spent_today = 10, 'exactly reaching the cap is allowed';

  -- 6. Settle success charges once; a second settle (callback + poll race) charges nothing.
  v := settle_generation_charge('10000000-0000-0000-0000-000000000001', true);
  assert v = 6, 'first settle charges 6, got ' || v;
  v := settle_generation_charge('10000000-0000-0000-0000-000000000001', true);
  assert v = 0, 'second settle must charge 0';
  assert (select balance from user_credits where user_id = '00000000-0000-0000-0000-00000000000a') = 94, 'balance 100 - 6';
  assert (select total_generations from user_credits where user_id = '00000000-0000-0000-0000-00000000000a') = 1, 'one generation counted';
  assert (select count(*) from credit_logs where generation_id = '10000000-0000-0000-0000-000000000001') = 1, 'one log row';

  -- 7. Settle failure releases without charging and frees the cap.
  v := settle_generation_charge('10000000-0000-0000-0000-000000000002', false);
  assert v = 0, 'release charges nothing';
  assert (select status from generation_charges where generation_id = '10000000-0000-0000-0000-000000000002') = 'released', 'released';
  v := settle_generation_charge('10000000-0000-0000-0000-000000000002', true);
  assert v = 0, 'a released charge cannot be charged later';
  assert (select balance from user_credits where user_id = '00000000-0000-0000-0000-00000000000a') = 94, 'balance unchanged by release';

  -- 8. Deleting the generation row keeps the charge (the cap cannot be reset that way).
  delete from generations where id = '10000000-0000-0000-0000-000000000001';
  assert (select count(*) from generation_charges where generation_id = '10000000-0000-0000-0000-000000000001') = 1, 'charge survives row delete';

  -- 9. Unknown generation: settle is a no-op.
  assert settle_generation_charge(gen_random_uuid(), true) = 0, 'unknown settle is 0';
  raise notice 'sequential checks passed';
end $$;

-- 10. Signed-in users cannot call the RPCs or write charges/limits directly.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$
begin
  begin
    perform reserve_generation_credits('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000003', 'm', 'kie', 0);
    raise exception 'authenticated could call reserve';
  exception when insufficient_privilege then null;
  end;
  begin
    perform settle_generation_charge('10000000-0000-0000-0000-000000000001', false);
    raise exception 'authenticated could call settle';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into generation_charges (generation_id, user_id, model_id, credits)
    values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'm', 0);
    raise exception 'authenticated could insert a charge';
  exception when insufficient_privilege then null;
  end;
  begin
    update user_spend_limits set daily_credit_cap = null where user_id = auth.uid();
    if found then raise exception 'authenticated could lift its own cap'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    delete from generation_charges where user_id = auth.uid();
    if found then raise exception 'authenticated could delete its charges'; end if;
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from generation_charges) = 2, 'user sees own charges only via RLS';
  raise notice 'privilege checks passed';
end $$;
