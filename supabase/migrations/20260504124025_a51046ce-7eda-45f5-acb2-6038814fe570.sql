-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- 1. Auto-receive shipment: create stock movements + update SKU cost
-- =====================================================
CREATE OR REPLACE FUNCTION public.receive_shipment_to_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _default_wh UUID;
  _item RECORD;
  _landed RECORD;
BEGIN
  -- Only act when status transitions TO 'warehouse'
  IF NEW.status = 'warehouse' AND (OLD.status IS DISTINCT FROM 'warehouse') THEN

    -- Find default warehouse
    SELECT id INTO _default_wh FROM public.warehouses WHERE is_default = true AND active = true LIMIT 1;
    IF _default_wh IS NULL THEN
      SELECT id INTO _default_wh FROM public.warehouses WHERE active = true ORDER BY created_at LIMIT 1;
    END IF;

    IF _default_wh IS NULL THEN
      RAISE NOTICE 'No active warehouse found, skipping auto-receive for shipment %', NEW.id;
      RETURN NEW;
    END IF;

    -- For each shipment item: write landed cost back to SKU + add stock
    FOR _item IN
      SELECT si.sku_id, si.quantity
      FROM public.shipment_items si
      WHERE si.shipment_id = NEW.id
    LOOP
      -- Apply landed cost to SKU if snapshot exists
      SELECT landed_unit_cost_usd, suggested_retail_clp INTO _landed
      FROM public.landed_costs
      WHERE shipment_id = NEW.id AND sku_id = _item.sku_id
      ORDER BY computed_at DESC LIMIT 1;

      IF _landed.landed_unit_cost_usd IS NOT NULL AND _landed.landed_unit_cost_usd > 0 THEN
        UPDATE public.skus
        SET cost_usd = _landed.landed_unit_cost_usd,
            updated_at = now()
        WHERE id = _item.sku_id;
      END IF;

      -- Upsert stock by warehouse
      INSERT INTO public.stock_by_warehouse (sku_id, warehouse_id, quantity, reserved)
      VALUES (_item.sku_id, _default_wh, _item.quantity, 0)
      ON CONFLICT (sku_id, warehouse_id)
      DO UPDATE SET
        quantity = public.stock_by_warehouse.quantity + EXCLUDED.quantity,
        updated_at = now();

      -- Sync legacy stock column on skus
      UPDATE public.skus
      SET stock = COALESCE(stock, 0) + _item.quantity,
          updated_at = now()
      WHERE id = _item.sku_id;

      -- Log movement
      INSERT INTO public.stock_movements (sku_id, warehouse_id, movement_type, quantity, reason, reference_type, reference_id)
      VALUES (_item.sku_id, _default_wh, 'in', _item.quantity, 'shipment_received', 'shipment', NEW.id);
    END LOOP;

    -- Audit log
    INSERT INTO public.audit_log (action, entity_type, entity_id, performed_by, details)
    VALUES ('shipment_received', 'shipment', NEW.id, 'system',
      jsonb_build_object('po_number', NEW.po_number, 'warehouse_id', _default_wh));
  END IF;

  RETURN NEW;
END;
$$;

-- Add unique constraint needed for ON CONFLICT (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_by_warehouse_sku_warehouse_unique'
  ) THEN
    ALTER TABLE public.stock_by_warehouse
      ADD CONSTRAINT stock_by_warehouse_sku_warehouse_unique UNIQUE (sku_id, warehouse_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_receive_shipment_to_stock ON public.shipments;
CREATE TRIGGER trg_receive_shipment_to_stock
AFTER UPDATE OF status ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.receive_shipment_to_stock();

-- Allow system inserts in stock_movements (relax policy: insert with NULL performed_by allowed via SECURITY DEFINER trigger)
DROP POLICY IF EXISTS "Auth insert kardex" ON public.stock_movements;
CREATE POLICY "Auth insert kardex"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  is_manager_or_admin(auth.uid())
  OR has_role(auth.uid(), 'warehouse'::app_role)
  OR performed_by IS NULL  -- system trigger
);

-- =====================================================
-- 2. Auto-release expired reservations
-- =====================================================
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER := 0;
  _r RECORD;
BEGIN
  FOR _r IN
    SELECT id FROM public.stock_reservations
    WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < now()
  LOOP
    PERFORM public.release_reservation(_r.id);
    _count := _count + 1;
  END LOOP;

  IF _count > 0 THEN
    INSERT INTO public.audit_log (action, entity_type, performed_by, details)
    VALUES ('reservations_expired', 'stock_reservation', 'system',
      jsonb_build_object('released_count', _count));
  END IF;

  RETURN _count;
END;
$$;

-- Schedule via pg_cron every 5 minutes
SELECT cron.unschedule('release-expired-reservations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-expired-reservations');

SELECT cron.schedule(
  'release-expired-reservations',
  '*/5 * * * *',
  $$ SELECT public.release_expired_reservations(); $$
);