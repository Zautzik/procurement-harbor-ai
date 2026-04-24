-- Allocation method enum
DO $$ BEGIN
  CREATE TYPE public.cost_allocation_method AS ENUM ('by_value','by_quantity','by_volume','by_weight');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Extend shipments with logistic dimensions + allocation method
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS weight_kg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_m3 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_allocation_method public.cost_allocation_method NOT NULL DEFAULT 'by_value',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS fx_rate_to_clp numeric DEFAULT 0;

-- Cost components (freight, customs, etc.)
CREATE TABLE IF NOT EXISTS public.import_cost_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  fx_rate_to_clp numeric DEFAULT 0,
  amount_clp numeric GENERATED ALWAYS AS (amount * COALESCE(fx_rate_to_clp,0)) STORED,
  is_percentage boolean NOT NULL DEFAULT false,
  percentage_of numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icc_shipment ON public.import_cost_components(shipment_id);

ALTER TABLE public.import_cost_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view cost components" ON public.import_cost_components
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage cost components" ON public.import_cost_components
  FOR ALL TO authenticated USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE TRIGGER trg_icc_updated BEFORE UPDATE ON public.import_cost_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Landed cost snapshot per shipment-item
CREATE TABLE IF NOT EXISTS public.landed_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  shipment_item_id uuid NOT NULL,
  sku_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  unit_fob_usd numeric NOT NULL DEFAULT 0,
  allocated_overhead_usd numeric NOT NULL DEFAULT 0,
  landed_unit_cost_usd numeric NOT NULL DEFAULT 0,
  landed_unit_cost_clp numeric NOT NULL DEFAULT 0,
  suggested_retail_clp numeric NOT NULL DEFAULT 0,
  target_margin_pct numeric NOT NULL DEFAULT 0,
  projected_revenue_clp numeric NOT NULL DEFAULT 0,
  projected_margin_clp numeric NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_shipment ON public.landed_costs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_lc_sku ON public.landed_costs(sku_id);

ALTER TABLE public.landed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view landed" ON public.landed_costs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage landed" ON public.landed_costs
  FOR ALL TO authenticated USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));

-- Revenue projections (scenarios)
CREATE TABLE IF NOT EXISTS public.revenue_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  scenario text NOT NULL DEFAULT 'base',
  sell_through_pct numeric NOT NULL DEFAULT 80,
  avg_discount_pct numeric NOT NULL DEFAULT 0,
  expected_revenue_clp numeric NOT NULL DEFAULT 0,
  expected_cogs_clp numeric NOT NULL DEFAULT 0,
  expected_margin_clp numeric NOT NULL DEFAULT 0,
  margin_pct numeric NOT NULL DEFAULT 0,
  payback_months numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rp_shipment ON public.revenue_projections(shipment_id);

ALTER TABLE public.revenue_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view projections" ON public.revenue_projections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage projections" ON public.revenue_projections
  FOR ALL TO authenticated USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE TRIGGER trg_rp_updated BEFORE UPDATE ON public.revenue_projections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();