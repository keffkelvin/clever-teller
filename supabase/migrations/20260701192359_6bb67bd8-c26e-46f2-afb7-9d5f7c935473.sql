
CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.products
     SET stock = stock + p_quantity
   WHERE id = p_product_id AND owner_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE(user_id uuid, email text, created_at timestamptz, roles app_role[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at,
         COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[])
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id
   GROUP BY u.id, u.email, u.created_at
   ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;
