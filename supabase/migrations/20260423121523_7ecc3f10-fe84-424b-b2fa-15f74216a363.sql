-- Atomic stock reservation function
CREATE OR REPLACE FUNCTION public.reserve_stock(
  _sku_id UUID,
  _warehouse_id UUID,
  _quantity NUMERIC,
  _order_id UUID,
  _expires_minutes INT DEFAULT 60
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _available NUMERIC;
  _reservation_id UUID;
BEGIN
  -- Lock the stock row
  SELECT (quantity - reserved) INTO _available
  FROM public.stock_by_warehouse
  WHERE sku_id = _sku_id AND warehouse_id = _warehouse_id
  FOR UPDATE;

  IF _available IS NULL THEN
    RAISE EXCEPTION 'No stock row for sku % in warehouse %', _sku_id, _warehouse_id;
  END IF;

  IF _available < _quantity THEN
    RAISE EXCEPTION 'Insufficient stock: available %, requested %', _available, _quantity;
  END IF;

  UPDATE public.stock_by_warehouse
  SET reserved = reserved + _quantity, updated_at = now()
  WHERE sku_id = _sku_id AND warehouse_id = _warehouse_id;

  INSERT INTO public.stock_reservations (sku_id, warehouse_id, quantity, order_id, status, expires_at, created_by)
  VALUES (_sku_id, _warehouse_id, _quantity, _order_id, 'active', now() + (_expires_minutes || ' minutes')::interval, auth.uid())
  RETURNING id INTO _reservation_id;

  RETURN _reservation_id;
END;
$$;

-- Release reservation
CREATE OR REPLACE FUNCTION public.release_reservation(_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r RECORD;
BEGIN
  SELECT * INTO _r FROM public.stock_reservations WHERE id = _reservation_id AND status = 'active' FOR UPDATE;
  IF _r IS NULL THEN RETURN FALSE; END IF;

  UPDATE public.stock_by_warehouse
  SET reserved = GREATEST(0, reserved - _r.quantity), updated_at = now()
  WHERE sku_id = _r.sku_id AND warehouse_id = _r.warehouse_id;

  UPDATE public.stock_reservations SET status = 'released' WHERE id = _reservation_id;
  RETURN TRUE;
END;
$$;

-- Confirm reservation: convert reserved -> consumed quantity (decrement both reserved & quantity)
CREATE OR REPLACE FUNCTION public.confirm_reservation(_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r RECORD;
BEGIN
  SELECT * INTO _r FROM public.stock_reservations WHERE id = _reservation_id AND status = 'active' FOR UPDATE;
  IF _r IS NULL THEN RETURN FALSE; END IF;

  UPDATE public.stock_by_warehouse
  SET reserved = GREATEST(0, reserved - _r.quantity),
      quantity = GREATEST(0, quantity - _r.quantity),
      updated_at = now()
  WHERE sku_id = _r.sku_id AND warehouse_id = _r.warehouse_id;

  INSERT INTO public.stock_movements (sku_id, warehouse_id, movement_type, quantity, reason, reference_type, reference_id, performed_by)
  VALUES (_r.sku_id, _r.warehouse_id, 'out', _r.quantity, 'order_fulfilled', 'order', _r.order_id, auth.uid());

  UPDATE public.stock_reservations SET status = 'consumed' WHERE id = _reservation_id;
  RETURN TRUE;
END;
$$;

-- Trigger: when payment is inserted, recompute order paid_amount
CREATE OR REPLACE FUNCTION public.recompute_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO _total FROM public.payments WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  UPDATE public.orders
  SET paid_amount = _total,
      paid_at = CASE WHEN _total >= COALESCE(total, 0) AND total > 0 THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_recompute ON public.payments;
CREATE TRIGGER trg_payments_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recompute_order_paid();
