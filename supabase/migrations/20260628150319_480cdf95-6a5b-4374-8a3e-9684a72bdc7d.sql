
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
     SET stock = GREATEST(stock - p_quantity, 0)
   WHERE id = p_product_id AND owner_id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO authenticated;
