
CREATE OR REPLACE FUNCTION public.receive_shipment_to_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _default_wh UUID;
  _item RECORD;
  _landed RECORD;
BEGIN
  IF NEW.status = 'warehouse' AND (OLD.status IS DISTINCT FROM 'warehouse') THEN
    SELECT id INTO _default_wh FROM public.warehouses WHERE is_default = true AND active = true LIMIT 1;
    IF _default_wh IS NULL THEN
      SELECT id INTO _default_wh FROM public.warehouses WHERE active = true ORDER BY created_at LIMIT 1;
    END IF;

    IF _default_wh IS NULL THEN
      RAISE NOTICE 'No active warehouse found, skipping auto-receive for shipment %', NEW.id;
      RETURN NEW;
    END IF;

    FOR _item IN
      SELECT si.sku_id, si.quantity
      FROM public.shipment_items si
      WHERE si.shipment_id = NEW.id
    LOOP
      SELECT landed_unit_cost_usd, suggested_retail_clp INTO _landed
      FROM public.landed_costs
      WHERE shipment_id = NEW.id AND sku_id = _item.sku_id
      ORDER BY computed_at DESC LIMIT 1;

      IF _landed.landed_unit_cost_usd IS NOT NULL AND _landed.landed_unit_cost_usd > 0 THEN
        UPDATE public.skus
        SET cost_usd = _landed.landed_unit_cost_usd,
            price_clp = CASE
              WHEN _landed.suggested_retail_clp IS NOT NULL AND _landed.suggested_retail_clp > 0
                THEN _landed.suggested_retail_clp
              ELSE price_clp
            END,
            updated_at = now()
        WHERE id = _item.sku_id;
      END IF;

      INSERT INTO public.stock_by_warehouse (sku_id, warehouse_id, quantity, reserved)
      VALUES (_item.sku_id, _default_wh, _item.quantity, 0)
      ON CONFLICT (sku_id, warehouse_id)
      DO UPDATE SET
        quantity = public.stock_by_warehouse.quantity + EXCLUDED.quantity,
        updated_at = now();

      UPDATE public.skus
      SET stock = COALESCE(stock, 0) + _item.quantity,
          updated_at = now()
      WHERE id = _item.sku_id;

      INSERT INTO public.stock_movements (sku_id, warehouse_id, movement_type, quantity, reason, reference_type, reference_id)
      VALUES (_item.sku_id, _default_wh, 'in', _item.quantity, 'shipment_received', 'shipment', NEW.id);
    END LOOP;

    INSERT INTO public.audit_log (action, entity_type, entity_id, performed_by, details)
    VALUES ('shipment_received', 'shipment', NEW.id, 'system',
      jsonb_build_object('po_number', NEW.po_number, 'warehouse_id', _default_wh, 'price_updated', true));
  END IF;

  RETURN NEW;
END;
$function$;
