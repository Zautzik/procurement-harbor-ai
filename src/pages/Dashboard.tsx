import { useEffect, useState } from "react";
import { Package, Ship, FileText, TrendingUp, AlertTriangle, Bell, ArrowUpRight, Activity, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList, Area, AreaChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

// Tiny sparkline data — premium feel
const spark = (seed: number) =>
  Array.from({ length: 12 }, (_, i) => ({ v: 50 + Math.sin(i * 0.6 + seed) * 18 + Math.random() * 8 }));

export default function Dashboard() {
  const { t } = useTranslation();
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
    ]).then(([s, sh, o, tr, a, al]) => {
      setSkus(s.data || []); setShipments(sh.data || []); setOrders(o.data || []);
      setTrends(tr.data || []); setAuditLog(a.data || []); setAlerts(al.data || []);
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
    { label: t("stockValue"), value: `$${(stockValue / 1000000).toFixed(1)}M`, sub: "CLP en bodegas", delta: "+8.2%", deltaType: "up" as const, icon: Package, accent: "primary", spark: spark(1) },
    { label: t("inTransit"), value: inTransit.length.toString().padStart(2, "0"), sub: `$${(inTransitValue / 1000000).toFixed(1)}M en tránsito`, delta: "+3", deltaType: "up" as const, icon: Ship, accent: "info", spark: spark(2) },
    { label: t("orders"), value: orders.length.toString().padStart(2, "0"), sub: `$${(ordersTotal / 1000).toFixed(0)}K facturado`, delta: "+12.4%", deltaType: "up" as const, icon: FileText, accent: "accent", spark: spark(3) },
    { label: t("trends"), value: `${trendAlignment}%`, sub: "Alineación de portafolio", delta: "+2 pts", deltaType: "up" as const, icon: TrendingUp, accent: "primary", spark: spark(4) },
    { label: t("lowStock"), value: lowStock.toString().padStart(2, "0"), sub: "SKUs requieren acción", delta: lowStock > 5 ? "Alto" : "Estable", deltaType: lowStock > 5 ? ("down" as const) : ("flat" as const), icon: AlertTriangle, accent: "destructive", spark: spark(5) },
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

  const accentMap: Record<string, string> = {
    primary: "text-primary bg-primary/10 ring-primary/20",
    info: "text-info bg-info/10 ring-info/20",
    accent: "text-accent bg-accent/10 ring-accent/20",
    destructive: "text-destructive bg-destructive/10 ring-destructive/20",
  };

  return (
    <div className="relative min-h-full">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-glow opacity-60" />

      <div className="relative space-y-8 p-6 lg:p-8">
        {/* Hero header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 animate-fade-in-up">
            <div className="flex items-center gap-2">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Live · {new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-balance lg:text-4xl">
              {t("commandCenter")}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground text-pretty">
              {t("realtimeView")} · Sincronizado con China, Valparaíso y bodegas LatAm.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg border-border/60 bg-card/60 backdrop-blur">
              <Activity className="h-3.5 w-3.5" /> Reporte semanal
            </Button>
            <Button size="sm" className="h-9 gap-2 rounded-lg bg-gradient-primary text-primary-foreground shadow-soft-md hover:shadow-glow transition-shadow">
              <Sparkles className="h-3.5 w-3.5" /> Nueva acción
            </Button>
          </div>
        </div>

        {alerts.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5 shadow-soft-sm animate-fade-in-up">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Bell className="h-4 w-4 text-destructive" /> Alertas activas
                <Badge variant="destructive" className="ml-1 h-5 rounded-md px-1.5 text-[10px] tabular-nums">{alerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm">
                  <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="h-5 text-[10px] uppercase tracking-wide">{a.severity}</Badge>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{a.title}</span>
                    {a.message && <span className="text-muted-foreground"> · {a.message}</span>}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => ackAlert(a.id)}>Reconocer</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* KPI grid — premium */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {kpis.map((kpi, idx) => (
            <Card
              key={kpi.label}
              className="group relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-lg animate-fade-in-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <CardContent className="relative p-5">
                <div className="flex items-start justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${accentMap[kpi.accent]}`}>
                    <kpi.icon className="h-[18px] w-[18px]" />
                  </div>
                  <span className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
                    kpi.deltaType === "up" ? "text-success" : kpi.deltaType === "down" ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {kpi.deltaType === "up" && <ArrowUpRight className="h-3 w-3" />}
                    {kpi.delta}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="kpi-value text-3xl leading-none">{kpi.value}</div>
                  <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground/80">{kpi.sub}</div>
                </div>
                {/* Sparkline */}
                <div className="mt-3 -mx-1 h-10 opacity-70 transition-opacity group-hover:opacity-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpi.spark}>
                      <defs>
                        <linearGradient id={`sg-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={`hsl(var(--chart-${(idx % 5) + 1}))`} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={`hsl(var(--chart-${(idx % 5) + 1}))`} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={`hsl(var(--chart-${(idx % 5) + 1}))`}
                        strokeWidth={1.5}
                        fill={`url(#sg-${idx})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-soft-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-sm font-semibold">Top SKUs por valor</CardTitle>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">CLP</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkus} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                    <YAxis dataKey="name" type="category" fontSize={11} width={130} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`$${(v / 1000000).toFixed(2)}M`, "Valor"]}
                    />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--primary-deep))" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="value" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-soft-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm font-semibold">Stock por composición</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockByFabric} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} stroke="hsl(var(--background))" strokeWidth={2} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {stockByFabric.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-soft-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm font-semibold">Embudo de pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" fontSize={11} />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-soft-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-sm font-semibold">Actividad en tiempo real</CardTitle>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary text-primary" /> Live
                </span>
              </div>
            </CardHeader>
            <CardContent className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {auditLog.length === 0 && <p className="text-sm text-muted-foreground">Sin actividad reciente</p>}
              {auditLog.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-border/40 hover:bg-secondary/40">
                  <Badge variant={a.performed_by === "ai" ? "default" : "secondary"} className="mt-0.5 h-5 shrink-0 rounded-md text-[10px] uppercase tracking-wide">
                    {a.performed_by === "ai" ? "IA" : "Op"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight">
                      <span className="font-medium">{a.action}</span>
                      <span className="text-muted-foreground"> · {a.entity_type}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground/80">
                      {new Date(a.created_at).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
