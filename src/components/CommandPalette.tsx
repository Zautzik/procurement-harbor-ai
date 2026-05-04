import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package, Warehouse, Ship, FileText, MessageSquare,
  TrendingUp, Calculator, Bot, Settings, Search,
} from "lucide-react";

type Hit = {
  id: string;
  type: "sku" | "order" | "shipment" | "client" | "page";
  label: string;
  sub?: string;
  url: string;
  icon: any;
};

const PAGES: Hit[] = [
  { id: "p-dash", type: "page", label: "Dashboard", url: "/", icon: LayoutDashboard },
  { id: "p-inv", type: "page", label: "Inventario", url: "/inventory", icon: Package },
  { id: "p-wh", type: "page", label: "Bodegas", url: "/warehouses", icon: Warehouse },
  { id: "p-ship", type: "page", label: "Embarques", url: "/shipments", icon: Ship },
  { id: "p-ord", type: "page", label: "Pedidos & Clientes", url: "/orders", icon: FileText },
  { id: "p-chat", type: "page", label: "Chat IA", url: "/chat", icon: MessageSquare },
  { id: "p-trends", type: "page", label: "Trend Radar", url: "/trends", icon: TrendingUp },
  { id: "p-cost", type: "page", label: "Motor de Costeo", url: "/costing", icon: Calculator },
  { id: "p-ai", type: "page", label: "Agente IA", url: "/ai-agent", icon: Bot },
  { id: "p-set", type: "page", label: "Configuración", url: "/settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = query.trim();
      if (q.length < 2) {
        setHits([]);
        return;
      }
      const like = `%${q}%`;
      const [skus, orders, ships, clients] = await Promise.all([
        supabase.from("skus").select("id,sku_code,name,fabric,color").or(`sku_code.ilike.${like},name.ilike.${like}`).limit(6),
        supabase.from("orders").select("id,total,clients(name)").limit(6),
        supabase.from("shipments").select("id,po_number,supplier,status").or(`po_number.ilike.${like},supplier.ilike.${like}`).limit(6),
        supabase.from("clients").select("id,name,rut,city").or(`name.ilike.${like},rut.ilike.${like}`).limit(6),
      ]);
      if (cancelled) return;
      const out: Hit[] = [];
      (skus.data || []).forEach((s: any) =>
        out.push({ id: `sku-${s.id}`, type: "sku", label: `${s.sku_code} · ${s.name}`, sub: `${s.fabric} ${s.color}`, url: "/inventory", icon: Package })
      );
      (ships.data || []).forEach((s: any) =>
        out.push({ id: `sh-${s.id}`, type: "shipment", label: s.po_number, sub: `${s.supplier} · ${s.status}`, url: "/shipments", icon: Ship })
      );
      (orders.data || []).forEach((o: any) =>
        out.push({ id: `o-${o.id}`, type: "order", label: `Pedido ${o.id.slice(0, 8)}`, sub: `${o.clients?.name || "—"} · $${(o.total || 0).toLocaleString()}`, url: "/orders", icon: FileText })
      );
      (clients.data || []).forEach((c: any) =>
        out.push({ id: `c-${c.id}`, type: "client", label: c.name, sub: `${c.rut || ""} ${c.city || ""}`.trim(), url: "/orders", icon: FileText })
      );
      setHits(out);
    };
    const t = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const go = (url: string) => {
    setOpen(false);
    setQuery("");
    navigate(url);
  };

  const filteredPages = PAGES.filter((p) =>
    query.length < 2 ? true : p.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar SKU, pedido, embarque, cliente o ir a…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        {filteredPages.length > 0 && (
          <CommandGroup heading="Navegación">
            {filteredPages.map((p) => (
              <CommandItem key={p.id} value={p.label} onSelect={() => go(p.url)}>
                <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {hits.length > 0 && (
          <CommandGroup heading="Resultados">
            {hits.map((h) => (
              <CommandItem key={h.id} value={h.label + h.sub} onSelect={() => go(h.url)}>
                <h.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm truncate">{h.label}</span>
                  {h.sub && <span className="text-[10px] text-muted-foreground truncate">{h.sub}</span>}
                </div>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground">{h.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
      className="hidden h-8 items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 text-xs text-muted-foreground transition hover:bg-secondary md:flex"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Buscar…</span>
      <kbd className="ml-2 rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
    </button>
  );
}
