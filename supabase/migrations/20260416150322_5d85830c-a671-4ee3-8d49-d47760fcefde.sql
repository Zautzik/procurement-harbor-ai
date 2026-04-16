
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'warehouse', 'readonly');
CREATE TYPE public.shipment_status AS ENUM ('ordered', 'production', 'shipped', 'customs', 'warehouse');
CREATE TYPE public.order_status AS ENUM ('borrador', 'confirmado', 'preparando', 'despachado', 'pagado');
CREATE TYPE public.ai_action_status AS ENUM ('pending', 'approved', 'rejected');

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================
-- USER ROLES (created first so functions can reference it)
-- =====================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions (now user_roles exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- PROFILES
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'es',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'manager');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- SKUS
-- =====================
CREATE TABLE public.skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  fabric TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  size TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  location TEXT DEFAULT '',
  trend_score INTEGER DEFAULT 0,
  photo_url TEXT,
  barcode TEXT,
  cost_usd NUMERIC(12,2) DEFAULT 0,
  price_clp NUMERIC(12,0) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view skus" ON public.skus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert skus" ON public.skus FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update skus" ON public.skus FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete skus" ON public.skus FOR DELETE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Warehouse can update stock" ON public.skus FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'warehouse'));

CREATE TRIGGER update_skus_updated_at BEFORE UPDATE ON public.skus
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- SHIPMENTS
-- =====================
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT NOT NULL,
  po_number TEXT NOT NULL,
  status shipment_status NOT NULL DEFAULT 'ordered',
  value NUMERIC(14,2) DEFAULT 0,
  eta DATE,
  item_count INTEGER DEFAULT 0,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view shipments" ON public.shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert shipments" ON public.shipments FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update shipments" ON public.shipments FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete shipments" ON public.shipments FOR DELETE TO authenticated USING (public.is_manager_or_admin(auth.uid()));

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- SHIPMENT ITEMS
-- =====================
CREATE TABLE public.shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE NOT NULL,
  sku_id UUID REFERENCES public.skus(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view shipment_items" ON public.shipment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage shipment_items" ON public.shipment_items FOR ALL TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =====================
-- CLIENTS
-- =====================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rut TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  total_purchases NUMERIC(14,0) DEFAULT 0,
  last_order_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_manager_or_admin(auth.uid()));

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- ORDERS
-- =====================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'borrador',
  total NUMERIC(14,0) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.is_manager_or_admin(auth.uid()));

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- ORDER ITEMS
-- =====================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  sku_id UUID REFERENCES public.skus(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,0) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view order_items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage order_items" ON public.order_items FOR ALL TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- =====================
-- TRENDS
-- =====================
CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  fabric_type TEXT,
  color_family TEXT,
  season TEXT,
  market TEXT DEFAULT 'Chile',
  description TEXT,
  sparkline_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view trends" ON public.trends FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage trends" ON public.trends FOR ALL TO authenticated USING (public.is_manager_or_admin(auth.uid()));

CREATE TRIGGER update_trends_updated_at BEFORE UPDATE ON public.trends
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- AUDIT LOG
-- =====================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  performed_by TEXT NOT NULL DEFAULT 'human',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view audit_log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- =====================
-- AI AGENT ACTIONS
-- =====================
CREATE TABLE public.ai_agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status ai_action_status NOT NULL DEFAULT 'pending',
  details JSONB DEFAULT '{}'::jsonb,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ai_actions" ON public.ai_agent_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can update ai_actions" ON public.ai_agent_actions FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "System can insert ai_actions" ON public.ai_agent_actions FOR INSERT TO authenticated WITH CHECK (true);

-- =====================
-- CHAT MESSAGES
-- =====================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agent_actions;
