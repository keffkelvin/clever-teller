
DROP FUNCTION IF EXISTS public.test_user_roles_rls();

DO $$
DECLARE
  admin_id uuid;
  nonadmin_id uuid := '00000000-0000-0000-0000-0000000000aa';
  v_count int;
  v_pass int := 0;
  v_fail int := 0;
  PROCEDURE_label text;
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role='admin' LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user in user_roles; cannot run tests';
  END IF;

  -- ADMIN SELECT
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', admin_id::text,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_count FROM public.user_roles;
    RESET ROLE;
    IF v_count >= 1 THEN
      RAISE NOTICE 'PASS  admin SELECT all rows (rows=%)', v_count; v_pass := v_pass+1;
    ELSE
      RAISE NOTICE 'FAIL  admin SELECT all rows (rows=%)', v_count; v_fail := v_fail+1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'FAIL  admin SELECT all rows: %', SQLERRM; v_fail := v_fail+1;
  END;

  -- ADMIN INSERT (admin_id + 'manager' to satisfy FK + unique)
  DELETE FROM public.user_roles WHERE user_id=admin_id AND role='manager';
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', admin_id::text,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.user_roles(user_id, role) VALUES (admin_id,'manager');
    RESET ROLE;
    RAISE NOTICE 'PASS  admin INSERT'; v_pass := v_pass+1;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'FAIL  admin INSERT: %', SQLERRM; v_fail := v_fail+1;
  END;

  -- ADMIN UPDATE
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', admin_id::text,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.user_roles SET role='cashier' WHERE user_id=admin_id AND role='manager';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RESET ROLE;
    IF v_count = 1 THEN
      RAISE NOTICE 'PASS  admin UPDATE'; v_pass := v_pass+1;
    ELSE
      RAISE NOTICE 'FAIL  admin UPDATE (updated=%)', v_count; v_fail := v_fail+1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'FAIL  admin UPDATE: %', SQLERRM; v_fail := v_fail+1;
  END;

  -- ADMIN DELETE
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', admin_id::text,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    DELETE FROM public.user_roles WHERE user_id=admin_id AND role='cashier';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RESET ROLE;
    IF v_count = 1 THEN
      RAISE NOTICE 'PASS  admin DELETE'; v_pass := v_pass+1;
    ELSE
      RAISE NOTICE 'FAIL  admin DELETE (deleted=%)', v_count; v_fail := v_fail+1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'FAIL  admin DELETE: %', SQLERRM; v_fail := v_fail+1;
  END;
  -- safety cleanup
  DELETE FROM public.user_roles WHERE user_id=admin_id AND role IN ('manager','cashier');

  -- NON-ADMIN SELECT others hidden
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', nonadmin_id::text,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_count FROM public.user_roles WHERE user_id <> nonadmin_id;
    RESET ROLE;
    IF v_count = 0 THEN
      RAISE NOTICE 'PASS  non-admin SELECT others hidden'; v_pass := v_pass+1;
    ELSE
      RAISE NOTICE 'FAIL  non-admin sees % other rows', v_count; v_fail := v_fail+1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'FAIL  non-admin SELECT: %', SQLERRM; v_fail := v_fail+1;
  END;

  -- NON-ADMIN INSERT denied
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', nonadmin_id::text,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.user_roles(user_id, role) VALUES (admin_id,'admin');
    RESET ROLE;
    RAISE NOTICE 'FAIL  non-admin INSERT was allowed'; v_fail := v_fail+1;
    DELETE FROM public.user_roles WHERE user_id=admin_id AND role='admin'
      AND id NOT IN (SELECT id FROM public.user_roles WHERE user_id=admin_id AND role='admin' ORDER BY created_at LIMIT 1);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'PASS  non-admin INSERT denied (%))', SQLERRM; v_pass := v_pass+1;
  END;

  -- NON-ADMIN UPDATE others blocked (0 rows)
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', nonadmin_id::text,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.user_roles SET role='cashier' WHERE user_id=admin_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RESET ROLE;
    IF v_count = 0 THEN
      RAISE NOTICE 'PASS  non-admin UPDATE others blocked'; v_pass := v_pass+1;
    ELSE
      RAISE NOTICE 'FAIL  non-admin UPDATE affected % rows', v_count; v_fail := v_fail+1;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'PASS  non-admin UPDATE denied by privilege'; v_pass := v_pass+1;
  WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'FAIL  non-admin UPDATE: %', SQLERRM; v_fail := v_fail+1;
  END;

  -- NON-ADMIN DELETE others blocked (0 rows)
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', nonadmin_id::text,'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    DELETE FROM public.user_roles WHERE user_id=admin_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RESET ROLE;
    IF v_count = 0 THEN
      RAISE NOTICE 'PASS  non-admin DELETE others blocked'; v_pass := v_pass+1;
    ELSE
      RAISE NOTICE 'FAIL  non-admin DELETE removed % rows', v_count; v_fail := v_fail+1;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'PASS  non-admin DELETE denied by privilege'; v_pass := v_pass+1;
  WHEN OTHERS THEN
    RESET ROLE;
    RAISE NOTICE 'FAIL  non-admin DELETE: %', SQLERRM; v_fail := v_fail+1;
  END;

  RAISE NOTICE '---- RESULTS: % passed, % failed ----', v_pass, v_fail;
  IF v_fail > 0 THEN RAISE EXCEPTION 'user_roles RLS tests failed: %', v_fail; END IF;
END $$;
