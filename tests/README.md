# Database tests

## `user_roles_rls.sql`

Automated RLS test suite for `public.user_roles`. Run by pasting the file
into the Supabase migration tool (the migration role can `SET ROLE
authenticated`, which the read-only psql role cannot). The block prints
`PASS …` / `FAIL …` notices and raises an exception (rolling back the
transaction) if any assertion fails — so a successful run = all tests passed.

Covers:
- Admin: SELECT, INSERT, UPDATE, DELETE on any row.
- Non-admin: cannot see other users' rows; INSERT/UPDATE/DELETE on others is blocked.
