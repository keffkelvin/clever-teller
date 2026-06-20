#!/usr/bin/env bash
# RLS tests for public.user_roles
# Verifies admin can SELECT/INSERT/UPDATE/DELETE all rows and non-admin cannot.
set -u
PASS=0; FAIL=0
ADMIN_ID="b6c67b16-e2aa-4ba9-bed6-70fe648db319"
NONADMIN_ID="00000000-0000-0000-0000-0000000000aa"
VICTIM_ID="00000000-0000-0000-0000-0000000000bb"

run_as() {
  # $1 = uid, $2 = sql; runs as `authenticated` role with JWT sub claim
  local uid="$1"; shift
  psql -X -A -t -v ON_ERROR_STOP=0 <<SQL 2>&1
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$uid','role','authenticated')::text, true);
$*
SQL
}

expect() {
  # $1 = label, $2 = expectation ("ok"|"deny"|"rows=N"), $3 = output
  local label="$1" expect="$2" out="$3"
  local ok=0
  case "$expect" in
    ok)   [[ "$out" != *ERROR* && "$out" != *"permission denied"* && "$out" != *"violates row-level"* ]] && ok=1 ;;
    deny) [[ "$out" == *"permission denied"* || "$out" == *"violates row-level"* || "$out" == *"new row violates"* ]] && ok=1 ;;
    rows=*) want="${expect#rows=}"; got=$(echo "$out"|grep -c '^[^(]'); [[ "$got" == "$want" ]] && ok=1 ;;
  esac
  if [[ $ok -eq 1 ]]; then echo "  PASS  $label"; PASS=$((PASS+1));
  else echo "  FAIL  $label  -- expected=$expect  got: $out"; FAIL=$((FAIL+1)); fi
}

echo "== Admin tests (uid=$ADMIN_ID) =="
out=$(run_as "$ADMIN_ID" "SELECT count(*) FROM public.user_roles;")
expect "admin SELECT all rows works" ok "$out"

out=$(run_as "$ADMIN_ID" "INSERT INTO public.user_roles(user_id, role) VALUES ('$VICTIM_ID','cashier') RETURNING id;")
expect "admin INSERT works" ok "$out"

out=$(run_as "$ADMIN_ID" "UPDATE public.user_roles SET role='manager' WHERE user_id='$VICTIM_ID' RETURNING id;")
expect "admin UPDATE works" ok "$out"

out=$(run_as "$ADMIN_ID" "DELETE FROM public.user_roles WHERE user_id='$VICTIM_ID' RETURNING id;")
expect "admin DELETE works" ok "$out"

echo "== Non-admin tests (uid=$NONADMIN_ID) =="
out=$(run_as "$NONADMIN_ID" "SELECT user_id FROM public.user_roles WHERE user_id <> '$NONADMIN_ID';")
expect "non-admin cannot see other users' rows" rows=0 "$out"

out=$(run_as "$NONADMIN_ID" "INSERT INTO public.user_roles(user_id, role) VALUES ('$NONADMIN_ID','admin');")
expect "non-admin INSERT denied" deny "$out"

out=$(run_as "$NONADMIN_ID" "UPDATE public.user_roles SET role='admin' WHERE user_id='$ADMIN_ID' RETURNING id;")
expect "non-admin UPDATE on others denied (no rows / blocked)" rows=0 "$out"

out=$(run_as "$NONADMIN_ID" "DELETE FROM public.user_roles WHERE user_id='$ADMIN_ID' RETURNING id;")
expect "non-admin DELETE on others denied (no rows / blocked)" rows=0 "$out"

echo
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
