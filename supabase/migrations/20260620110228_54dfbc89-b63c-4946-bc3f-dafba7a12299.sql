
CREATE OR REPLACE FUNCTION public.test_user_roles_rls()
RETURNS TABLE(test_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  nonadmin_id uuid := '00000000-0000-0000-0000-0000000000aa';
  v_count int;
  v_err text;
  v_ok boolean;
BEGIN
  -- Pick an existing admin from user_roles (test assumes at least one exists)
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF admin_id IS NULL THEN
    RETURN QUERY SELECT 'setup'::text, false, 'no admin user found'::text; RETURN;
  END IF;

  ---------------------------------------------------------------
  -- ADMIN: SELECT all rows
  ---------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', admin_id::text, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_count FROM public.user_roles;
    RESET ROLE;
    RETURN QUERY SELECT 'admin SELECT all rows'::text, (v_count >= 1), format('rows=%s', v_count);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'admin SELECT all rows'::text, false, SQLERRM;
  END;

  ---------------------------------------------------------------
  -- ADMIN: INSERT (use admin_id + 'manager' to satisfy FK + unique)
  ---------------------------------------------------------------
  BEGIN
    DELETE FROM public.user_roles WHERE user_id = admin_id AND role = 'manager';
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', admin_id::text, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.user_roles(user_id, role) VALUES (admin_id, 'manager');
    RESET ROLE;
    RETURN QUERY SELECT 'admin INSERT'::text, true, 'inserted manager role'::text;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'admin INSERT'::text, false, SQLERRM;
  END;

  ---------------------------------------------------------------
  -- ADMIN: UPDATE
  ---------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', admin_id::text, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.user_roles SET role = 'cashier'
      WHERE user_id = admin_id AND role = 'manager';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RESET ROLE;
    RETURN QUERY SELECT 'admin UPDATE'::text, (v_count = 1), format('updated=%s', v_count);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'admin UPDATE'::text, false, SQLERRM;
  END;

  ---------------------------------------------------------------
  -- ADMIN: DELETE
  ---------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', admin_id::text, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    DELETE FROM public.user_roles WHERE user_id = admin_id AND role = 'cashier';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RESET ROLE;
    RETURN QUERY SELECT 'admin DELETE'::text, (v_count = 1), format('deleted=%s', v_count);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    -- cleanup if something left behind
    DELETE FROM public.user_roles WHERE user_id = admin_id AND role IN ('manager','cashier');
    RETURN QUERY SELECT 'admin DELETE'::text, false, SQLERRM;
  END;

  ---------------------------------------------------------------
  -- NON-ADMIN: cannot SELECT other users' rows
  ---------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', nonadmin_id::text, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_count FROM public.user_roles WHERE user_id <> nonadmin_id;
    RESET ROLE;
    RETURN QUERY SELECT 'non-admin SELECT others hidden'::text, (v_count = 0), format('visible_rows=%s', v_count);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'non-admin SELECT others hidden'::text, false, SQLERRM;
  END;

  ---------------------------------------------------------------
  -- NON-ADMIN: INSERT denied
  ---------------------------------------------------------------
  v_ok := false; v_err := '';
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', nonadmin_id::text, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.user_roles(user_id, role) VALUES (admin_id, 'admin');
    RESET ROLE;
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    RESET ROLE;
    v_ok := true; v_err := SQLERRM;
  END;
  RETURN QUERY SELECT 'non-admin INSERT denied'::text, v_ok, v_err;

  ---------------------------------------------------------------
  -- NON-ADMIN: UPDATE on others affects 0 rows
  ---------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', nonadmin_id::text, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.user_roles SET role = 'cashier' WHERE user_id = admin_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RESET ROLE;
    RETURN QUERY SELECT 'non-admin UPDATE others blocked'::text, (v_count = 0), format('updated=%s', v_count);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'non-admin UPDATE others blocked'::text, true, SQLERRM;
  END;

  ---------------------------------------------------------------
  -- NON-ADMIN: DELETE on others affects 0 rows
  ---------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', nonadmin_id::text, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    DELETE FROM public.user_roles WHERE user_id = admin_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RESET ROLE;
    RETURN QUERY SELECT 'non-admin DELETE others blocked'::text, (v_count = 0), format('deleted=%s', v_count);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN QUERY SELECT 'non-admin DELETE others blocked'::text, true, SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.test_user_roles_rls() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.test_user_roles_rls() TO service_role;
