import { Package, Ship, FileText, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { skus, shipments, orders, revenueByMonth, topSkusBySales, stockByFabric, activities } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

const kpis = [
  {
    label: "Valor Stock Total",
    value: `$${(skus.reduce((s, i) => s + i.stock * i.price, 0) / 1000000).toFixed(1)}M`,
    sub: "CLP",
    icon: Package,
    color: "text-primary",
  },
  {
    label: "Embarques en Tránsito",
    value: shipments.filter((s) => s.status !== "warehouse").length,
    sub: `$${(shipments.filter((s) => s.status !== "warehouse").reduce((s, i) => s + i.value, 0) / 1000000).toFixed(1)}M`,
    icon: Ship,
    color: "text-chart-2",
  },
  {
    label: "Pedidos este Mes",
    value: orders.length,
    sub: `$${(orders.reduce((s, o) => s + o.total, 0) / 1000).toFixed(0)}K CLP`,
    icon: FileText,
    color: "text-chart-3",
  },
  {
    label: "Alineación Tendencias",
    value: "78%",
    sub: "Score general",
    icon: TrendingUp,
    color: "text-primary",
  },
  {
    label: "Stock Bajo",
    value: skus.filter((s) => s.stock < 15).length,
    sub: "SKUs críticos",
    icon: AlertTriangle,
    color: "text-destructive",
  },
];

const CHART_COLORS = [
  "hsl(155 100% 41%)",
  "hsl(200 80% 50%)",
  "hsl(47 100% 50%)",
  "hsl(280 60% 55%)",
  "hsl(0 84% 60%)",
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Centro de Comando</h1>
        <p className="text-sm text-muted-foreground">Vista ejecutiva de tu negocio textil</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="text-2xl font-heading font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Ingresos por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => [`$${(v / 1000000).toFixed(2)}M CLP`, "Ingresos"]} />
                  <Bar dataKey="revenue" fill="hsl(155 100% 41%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock by Fabric */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Stock por Tipo de Tela</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockByFabric} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                    {stockByFabric.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top SKUs + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Top 5 SKUs por Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSkusBySales} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(200 80% 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[260px] overflow-y-auto">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <Badge variant={a.method === "ai" ? "default" : "secondary"} className="text-[10px] mt-0.5 shrink-0">
                  {a.method === "ai" ? "IA" : "Manual"}
                </Badge>
                <div className="min-w-0">
                  <p className="text-foreground leading-snug">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.actor} · {a.timestamp}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
