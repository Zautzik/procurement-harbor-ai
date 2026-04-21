
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE TABLE IF NOT EXISTS public.weekly_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  top_trends jsonb DEFAULT '[]'::jsonb,
  at_risk_skus jsonb DEFAULT '[]'::jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view digests" ON public.weekly_digests;
CREATE POLICY "Authenticated can view digests" ON public.weekly_digests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Managers can insert digests" ON public.weekly_digests;
CREATE POLICY "Managers can insert digests" ON public.weekly_digests FOR INSERT TO authenticated WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  entity_type text,
  entity_id uuid,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view alerts" ON public.alerts;
CREATE POLICY "Authenticated can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can update alerts" ON public.alerts;
CREATE POLICY "Authenticated can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Managers can insert alerts" ON public.alerts;
CREATE POLICY "Managers can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.telegram_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL UNIQUE,
  username text,
  user_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage telegram subs" ON public.telegram_subscribers;
CREATE POLICY "Admins manage telegram subs" ON public.telegram_subscribers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.shipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipment_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated view shipment docs" ON public.shipment_documents;
CREATE POLICY "Authenticated view shipment docs" ON public.shipment_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Managers manage shipment docs" ON public.shipment_documents;
CREATE POLICY "Managers manage shipment docs" ON public.shipment_documents FOR ALL TO authenticated USING (is_manager_or_admin(auth.uid())) WITH CHECK (is_manager_or_admin(auth.uid()));

INSERT INTO storage.buckets (id, name, public) VALUES ('shipment-docs', 'shipment-docs', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', true) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Auth users read shipment docs" ON storage.objects;
CREATE POLICY "Auth users read shipment docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shipment-docs');
DROP POLICY IF EXISTS "Managers upload shipment docs" ON storage.objects;
CREATE POLICY "Managers upload shipment docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shipment-docs' AND is_manager_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Managers delete shipment docs" ON storage.objects;
CREATE POLICY "Managers delete shipment docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shipment-docs' AND is_manager_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Public read chat uploads" ON storage.objects;
CREATE POLICY "Public read chat uploads" ON storage.objects FOR SELECT USING (bucket_id = 'chat-uploads');
DROP POLICY IF EXISTS "Auth upload chat uploads" ON storage.objects;
CREATE POLICY "Auth upload chat uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-uploads');

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.skus;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
