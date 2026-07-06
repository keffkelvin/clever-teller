
-- Trigger-only function: no API role should call this directly.
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

-- has_role is used in RLS policies for signed-in users. Keep authenticated EXECUTE, remove anon/PUBLIC.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Admin-only listing. Keep authenticated (internal check throws for non-admins), remove anon/PUBLIC.
REVOKE ALL ON FUNCTION public.list_users_with_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated, service_role;
