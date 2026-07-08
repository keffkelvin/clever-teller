
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points numeric NOT NULL DEFAULT 0;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS tax_inclusive boolean NOT NULL DEFAULT false;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS loyalty_rate numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  reference_no text,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_payments TO authenticated;
GRANT ALL ON public.supplier_payments TO service_role;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage supplier payments" ON public.supplier_payments FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  actor_id uuid,
  entity text NOT NULL,
  entity_id text,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = owner_id);
