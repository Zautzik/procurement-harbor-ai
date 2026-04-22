-- ============= WAREHOUSES =============
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  city text,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage warehouses" ON public.warehouses FOR ALL TO authenticated
  USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default
INSERT INTO public.warehouses (code, name, city, is_default) VALUES ('MAIN', 'Bodega Principal', 'Santiago', true);

-- ============= STOCK BY WAREHOUSE =============
CREATE TABLE public.stock_by_warehouse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid NOT NULL REFERENCES public.skus(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  reserved integer NOT NULL DEFAULT 0,
  reorder_point integer DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sku_id, warehouse_id)
);
ALTER TABLE public.stock_by_warehouse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view stock" ON public.stock_by_warehouse FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage stock" ON public.stock_by_warehouse FOR ALL TO authenticated
  USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE POLICY "Warehouse update stock" ON public.stock_by_warehouse FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'warehouse'));
CREATE INDEX idx_stock_sku ON public.stock_by_warehouse(sku_id);
CREATE INDEX idx_stock_wh ON public.stock_by_warehouse(warehouse_id);

-- Backfill existing stock into default warehouse
INSERT INTO public.stock_by_warehouse (sku_id, warehouse_id, quantity)
SELECT s.id, (SELECT id FROM public.warehouses WHERE is_default LIMIT 1), s.stock
FROM public.skus s;

-- ============= STOCK MOVEMENTS (KARDEX) =============
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid NOT NULL REFERENCES public.skus(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  movement_type text NOT NULL CHECK (movement_type IN ('in','out','transfer','adjustment','reservation','release')),
  quantity integer NOT NULL,
  reason text,
  reference_type text,
  reference_id uuid,
  to_warehouse_id uuid REFERENCES public.warehouses(id),
  performed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view kardex" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert kardex" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()) OR has_role(auth.uid(), 'warehouse'));
CREATE INDEX idx_kardex_sku ON public.stock_movements(sku_id, created_at DESC);
CREATE INDEX idx_kardex_wh ON public.stock_movements(warehouse_id, created_at DESC);

-- ============= STOCK RESERVATIONS =============
CREATE TABLE public.stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid NOT NULL REFERENCES public.skus(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','consumed','expired')),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view reservations" ON public.stock_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage reservations" ON public.stock_reservations FOR ALL TO authenticated
  USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE INDEX idx_resv_sku ON public.stock_reservations(sku_id, status);

-- ============= PAYMENTS =============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'CLP',
  method text NOT NULL,
  reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage payments" ON public.payments FOR ALL TO authenticated
  USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE INDEX idx_payments_order ON public.payments(order_id);

-- ============= FX RATES =============
CREATE TABLE public.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  rate numeric NOT NULL CHECK (rate > 0),
  rate_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency, rate_date)
);
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view fx" ON public.fx_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage fx" ON public.fx_rates FOR ALL TO authenticated
  USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));

INSERT INTO public.fx_rates (base_currency, quote_currency, rate) VALUES ('USD','CLP', 950);

-- ============= RATE LIMITS (server-only) =============
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  count integer NOT NULL DEFAULT 1,
  UNIQUE (user_id, action, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = only service role can access
CREATE INDEX idx_rl_user_action ON public.rate_limits(user_id, action, window_start DESC);

-- ============= HELPER: available stock view-like function =============
CREATE OR REPLACE FUNCTION public.get_available_stock(_sku_id uuid, _warehouse_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(quantity - reserved, 0)
  FROM public.stock_by_warehouse
  WHERE sku_id = _sku_id AND warehouse_id = _warehouse_id;
$$;