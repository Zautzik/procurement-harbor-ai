import { useEffect, useState } from "react";
import { Package, Ship, FileText, TrendingUp, AlertTriangle, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CHART_COLORS = ["hsl(155 100% 41%)", "hsl(200 80% 50%)", "hsl(47 100% 50%)", "hsl(280 60% 55%)", "hsl(0 84% 60%)"];

export default function Dashboard() {
  const [skus, setSkus] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const load = () => {
    Promise.all([
      supabase.from("skus").select("*"),
      supabase.from("shipments").select("*"),
      supabase.from("orders").select("*"),
      supabase.from("trends").select("score"),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false }).limit(10),
    ]).then(([s, sh, o, t, a, al]) => {
      setSkus(s.data || []); setShipments(sh.data || []); setOrders(o.data || []);
      setTrends(t.data || []); setAuditLog(a.data || []); setAlerts(al.data || []);
    });
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("dash-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const ackAlert = async (id: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("alerts").update({ acknowledged: true, acknowledged_by: user?.id, acknowledged_at: new Date().toISOString() }).eq("id", id);
    toast.success("Alerta reconocida");
  };

  const stockValue = skus.reduce((s, i) => s + (i.stock || 0) * (i.price_clp || 0), 0);
  const inTransit = shipments.filter((s) => s.status !== "warehouse");
  const inTransitValue = inTransit.reduce((s, i) => s + (i.value || 0), 0);
  const ordersTotal = orders.reduce((s, o) => s + (o.total || 0), 0);
  const trendAlignment = trends.length ? Math.round(trends.reduce((s, t) => s + t.score, 0) / trends.length) : 0;
  const lowStock = skus.filter((s) => (s.stock || 0) < 15).length;

  const kpis = [
    { label: "Valor Stock", value: `$${(stockValue / 1000000).toFixed(1)}M`, sub: "CLP", icon: Package, color: "text-primary" },
    { label: "En Tránsito", value: inTransit.length, sub: `$${(inTransitValue / 1000000).toFixed(1)}M`, icon: Ship, color: "text-chart-2" },
    { label: "Pedidos", value: orders.length, sub: `$${(ordersTotal / 1000).toFixed(0)}K`, icon: FileText, color: "text-chart-3" },
    { label: "Tendencias", value: `${trendAlignment}%`, sub: "Score", icon: TrendingUp, color: "text-primary" },
    { label: "Stock Bajo", value: lowStock, sub: "SKUs", icon: AlertTriangle, color: "text-destructive" },
  ];

  const fabricMap: Record<string, number> = {};
  skus.forEach((s) => { fabricMap[s.fabric] = (fabricMap[s.fabric] || 0) + (s.stock || 0); });
  const stockByFabric = Object.entries(fabricMap).map(([name, value]) => ({ name, value }));
  const topSkus = [...skus].map((s) => ({ name: s.name, value: (s.stock || 0) * (s.price_clp || 0) })).sort((a, b) => b.value - a.value).slice(0, 5);

  const statuses = ["borrador", "confirmado", "preparando", "despachado", "pagado"];
  const funnelData = statuses.map((st, i) => ({
    name: st.charAt(0).toUpperCase() + st.slice(1),
    value: orders.filter((o) => statuses.indexOf(o.status) >= i).length,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Centro de Comando</h1>
        <p className="text-sm text-muted-foreground">Vista ejecutiva en tiempo real</p>
      </div>

      {alerts.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2"><Bell className="h-4 w-4 text-destructive" /> Alertas activas ({alerts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">{a.severity}</Badge>
                <div className="flex-1"><span className="font-medium">{a.title}</span> · <span className="text-muted-foreground text-xs">{a.message}</span></div>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => ackAlert(a.id)}>OK</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2"><kpi.icon className={`h-5 w-5 ${kpi.color}`} /></div>
              <div className="text-2xl font-heading font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-heading">Top 5 SKUs por Valor</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSkus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <YAxis dataKey="name" type="category" fontSize={11} width={140} />
                  <Tooltip formatter={(v: number) => [`$${(v / 1000000).toFixed(2)}M`, "Valor"]} />
                  <Bar dataKey="value" fill="hsl(155 100% 41%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-heading">Stock por Tela</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockByFabric} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                    {stockByFabric.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-heading">Embudo de Pedidos</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" fontSize={11} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-heading">Actividad (Audit Log)</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-[250px] overflow-y-auto">
            {auditLog.length === 0 && <p className="text-sm text-muted-foreground">Sin actividad</p>}
            {auditLog.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <Badge variant={a.performed_by === "ai" ? "default" : "secondary"} className="text-[10px] mt-0.5 shrink-0">{a.performed_by === "ai" ? "IA" : "Humano"}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{a.action} · <span className="text-muted-foreground">{a.entity_type}</span></p>
                  <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
