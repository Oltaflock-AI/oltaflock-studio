#!/usr/bin/env bash
# Tests the server-side credit migration on a THROWAWAY local Postgres cluster
# (never the Supabase project): sequential checks, privilege checks, and a
# concurrency check that parallel requests cannot overdraw a daily cap.
# Needs initdb/pg_ctl/psql on PATH (brew install postgresql@17).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
PORT="${PORT:-54329}"
trap 'pg_ctl -D "$TMP/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

initdb -D "$TMP/db" -U postgres --auth=trust >/dev/null
pg_ctl -D "$TMP/db" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$TMP" -p "$PORT" -U postgres -d postgres)

"${PSQL[@]}" -f "$ROOT/scripts/credit-charges/stub.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261106120000_server_side_credit_charges.sql"
"${PSQL[@]}" -f "$ROOT/scripts/credit-charges/test.sql"

# Concurrency: user C has a cap of 10; 20 parallel requests each try to reserve 3.
"${PSQL[@]}" <<'SQL'
insert into auth.users values ('00000000-0000-0000-0000-00000000000c');
insert into user_credits (user_id, balance) values ('00000000-0000-0000-0000-00000000000c', 100);
insert into user_spend_limits (user_id, daily_credit_cap) values ('00000000-0000-0000-0000-00000000000c', 10);
insert into generations (id, user_id)
  select ('30000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid, '00000000-0000-0000-0000-00000000000c'
  from generate_series(1, 20) i;
SQL
for i in $(seq 1 20); do
  "${PSQL[@]}" -c "set role service_role; select pg_sleep(0.05); select * from reserve_generation_credits('00000000-0000-0000-0000-00000000000c', ('30000000-0000-0000-0000-' || lpad('$i', 12, '0'))::uuid, 'm', 'kie', 3);" >/dev/null &
done
wait
OK_COUNT=$("${PSQL[@]}" -At -c "select count(*) from generation_charges where user_id = '00000000-0000-0000-0000-00000000000c'")
SPENT=$("${PSQL[@]}" -At -c "select sum(credits) from generation_charges where user_id = '00000000-0000-0000-0000-00000000000c'")
if [ "$OK_COUNT" != "3" ] || [ "$SPENT" != "9" ]; then
  echo "FAIL: concurrency: $OK_COUNT reservations, $SPENT credits (want 3 and 9 under a cap of 10)"; exit 1
fi
echo "concurrency check passed (20 parallel requests, 3 reserved, 9 of 10 credits)"
echo "ALL CREDIT CHARGE CHECKS PASSED"
