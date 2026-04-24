import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Ship,
  TrendingUp,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  DollarSign,
  Percent,
  Package,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Shipment = {
  id: string;
  po_number: string;
  supplier: string;
  status: string;
  value: number | null;
  item_count: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  cost_allocation_method: "by_value" | "by_quantity" | "by_volume" | "by_weight";
  currency: string;
  fx_rate_to_clp: number | null;
  eta: string | null;
};

type ShipmentItem = {
  id: string;
  sku_id: string;
  quantity: number;
  sku?: {
    sku_code: string;
    name: string;
    fabric: string;
    color: string;
    cost_usd: number | null;
    price_clp: number | null;
  };
};

type CostComponent = {
  id: string;
  shipment_id: string;
  category: string;
  description: string | null;
  amount: number;
  currency: string;
  fx_rate_to_clp: number | null;
  amount_clp: number;
  is_percentage: boolean;
};

const CATEGORIES = [
  { value: "freight", label: "Flete marítimo" },
  { value: "insurance", label: "Seguro" },
  { value: "customs", label: "Aduana" },
  { value: "tariffs", label: "Aranceles" },
  { value: "port_fees", label: "Tasas portuarias" },
  { value: "inland", label: "Transporte interno" },
  { value: "agent", label: "Agente / Despachante" },
  { value: "financing", label: "Financiamiento" },
  { value: "warehousing", label: "Almacenaje" },
  { value: "other", label: "Otros" },
];

const ALLOCATION_LABELS: Record<string, string> = {
  by_value: "Por valor FOB",
  by_quantity: "Por cantidad",
  by_volume: "Por volumen (m³)",
  by_weight: "Por peso (kg)",
};

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);
const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;

export default function Costing() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [components, setComponents] = useState<CostComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  const [newComp, setNewComp] = useState({
    category: "freight",
    description: "",
    amount: "",
    currency: "USD",
  });

  const [scenario, setScenario] = useState<"pessimistic" | "base" | "optimistic">("base");
  const [sellThrough, setSellThrough] = useState([80]);
  const [discount, setDiscount] = useState([0]);
  const [targetMargin, setTargetMargin] = useState([55]);

  const selected = shipments.find((s) => s.id === selectedId) || null;
  const fx = selected?.fx_rate_to_clp || 950;

  useEffect(() => {
    loadShipments();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadShipmentDetail(selectedId);
    }
  }, [selectedId]);

  async function loadShipments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("shipments")
      .select("id,po_number,supplier,status,value,item_count,weight_kg,volume_m3,cost_allocation_method,currency,fx_rate_to_clp,eta")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setShipments((data as Shipment[]) || []);
      if (data && data.length && !selectedId) setSelectedId(data[0].id);
    }
    setLoading(false);
  }

  async function loadShipmentDetail(id: string) {
    const [{ data: itemsData }, { data: compData }] = await Promise.all([
      supabase
        .from("shipment_items")
        .select("id,sku_id,quantity,sku:skus(sku_code,name,fabric,color,cost_usd,price_clp)")
        .eq("shipment_id", id),
      supabase
        .from("import_cost_components")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: true }),
    ]);
    setItems((itemsData as any) || []);
    setComponents((compData as any) || []);
  }

  // Totals
  const totals = useMemo(() => {
    const fobUsd = items.reduce((s, it) => s + (it.sku?.cost_usd || 0) * it.quantity, 0);
    const totalQty = items.reduce((s, it) => s + it.quantity, 0);
    const overheadClp = components.reduce((s, c) => s + Number(c.amount_clp || 0), 0);
    const fobClp = fobUsd * fx;
    const landedClp = fobClp + overheadClp;
    const overheadPct = fobClp > 0 ? (overheadClp / fobClp) * 100 : 0;
    return { fobUsd, fobClp, overheadClp, landedClp, overheadPct, totalQty };
  }, [items, components, fx]);

  // Per-line landed cost calculation (live, in-memory)
  const lines = useMemo(() => {
    const method = selected?.cost_allocation_method || "by_value";
    return items.map((it) => {
      const unitFobUsd = it.sku?.cost_usd || 0;
      const lineFobUsd = unitFobUsd * it.quantity;
      let weight = 0;
      if (method === "by_value") weight = totals.fobUsd > 0 ? lineFobUsd / totals.fobUsd : 0;
      else if (method === "by_quantity") weight = totals.totalQty > 0 ? it.quantity / totals.totalQty : 0;
      else weight = totals.totalQty > 0 ? it.quantity / totals.totalQty : 0; // fallback if no vol/weight data
      const allocOverheadClp = totals.overheadClp * weight;
      const lineLandedClp = lineFobUsd * fx + allocOverheadClp;
      const unitLandedClp = it.quantity > 0 ? lineLandedClp / it.quantity : 0;
      const unitLandedUsd = fx > 0 ? unitLandedClp / fx : 0;
      const currentRetail = it.sku?.price_clp || 0;
      const suggestedRetail = unitLandedClp / Math.max(0.0001, 1 - targetMargin[0] / 100);
      const marginAtCurrent =
        currentRetail > 0 ? ((currentRetail - unitLandedClp) / currentRetail) * 100 : 0;
      return {
        ...it,
        unitFobUsd,
        lineFobUsd,
        allocOverheadClp,
        unitLandedUsd,
        unitLandedClp,
        currentRetail,
        suggestedRetail,
        marginAtCurrent,
      };
    });
  }, [items, totals, fx, selected, targetMargin]);

  // Scenario projection
  const projection = useMemo(() => {
    const scenarioMods: Record<string, { sell: number; disc: number }> = {
      pessimistic: { sell: -15, disc: 10 },
      base: { sell: 0, disc: 0 },
      optimistic: { sell: 10, disc: -5 },
    };
    const mod = scenarioMods[scenario];
    const effectiveSellThrough = Math.max(0, Math.min(100, sellThrough[0] + mod.sell));
    const effectiveDiscount = Math.max(0, discount[0] + mod.disc);

    let revenue = 0;
    let cogs = 0;
    lines.forEach((l) => {
      const sellPrice = l.suggestedRetail * (1 - effectiveDiscount / 100);
      const unitsSold = Math.floor(l.quantity * (effectiveSellThrough / 100));
      revenue += sellPrice * unitsSold;
      cogs += l.unitLandedClp * unitsSold;
    });
    const margin = revenue - cogs;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    const monthlyRevenueEstimate = revenue / 6; // assume 6-month sell window
    const paybackMonths = monthlyRevenueEstimate > 0 ? totals.landedClp / monthlyRevenueEstimate : 0;
    return { revenue, cogs, margin, marginPct, effectiveSellThrough, effectiveDiscount, paybackMonths };
  }, [lines, scenario, sellThrough, discount, totals]);

  async function addComponent() {
    if (!selectedId || !newComp.amount) return;
    const amount = Number(newComp.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Monto inválido");
      return;
    }
    const fxRate = newComp.currency === "CLP" ? 1 : fx;
    const { error } = await supabase.from("import_cost_components").insert({
      shipment_id: selectedId,
      category: newComp.category,
      description: newComp.description || null,
      amount,
      currency: newComp.currency,
      fx_rate_to_clp: fxRate,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Costo agregado");
    setNewComp({ category: "freight", description: "", amount: "", currency: "USD" });
    loadShipmentDetail(selectedId);
  }

  async function removeComponent(id: string) {
    const { error } = await supabase.from("import_cost_components").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    if (selectedId) loadShipmentDetail(selectedId);
  }

  async function updateShipmentMeta(patch: Record<string, any>) {
    if (!selectedId) return;
    const { error } = await supabase.from("shipments").update(patch as any).eq("id", selectedId);
    if (error) return toast.error(error.message);
    loadShipments();
  }

  async function persistSnapshot() {
    if (!selectedId) return;
    setComputing(true);
    try {
      // Wipe previous snapshot for this shipment
      await supabase.from("landed_costs").delete().eq("shipment_id", selectedId);
      const rows = lines.map((l) => ({
        shipment_id: selectedId,
        shipment_item_id: l.id,
        sku_id: l.sku_id,
        quantity: l.quantity,
        unit_fob_usd: l.unitFobUsd,
        allocated_overhead_usd: fx > 0 ? l.allocOverheadClp / fx : 0,
        landed_unit_cost_usd: l.unitLandedUsd,
        landed_unit_cost_clp: l.unitLandedClp,
        suggested_retail_clp: l.suggestedRetail,
        target_margin_pct: targetMargin[0],
        projected_revenue_clp: l.suggestedRetail * l.quantity * (sellThrough[0] / 100),
        projected_margin_clp:
          (l.suggestedRetail - l.unitLandedClp) * l.quantity * (sellThrough[0] / 100),
      }));
      if (rows.length) {
        const { error } = await supabase.from("landed_costs").insert(rows);
        if (error) throw error;
      }

      // Persist projection scenario
      const { error: pErr } = await supabase.from("revenue_projections").insert({
        shipment_id: selectedId,
        scenario,
        sell_through_pct: projection.effectiveSellThrough,
        avg_discount_pct: projection.effectiveDiscount,
        expected_revenue_clp: projection.revenue,
        expected_cogs_clp: projection.cogs,
        expected_margin_clp: projection.margin,
        margin_pct: projection.marginPct,
        payback_months: projection.paybackMonths,
      });
      if (pErr) throw pErr;
      toast.success("Snapshot guardado", {
        description: `${rows.length} líneas + escenario ${scenario}`,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setComputing(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em] font-semibold">
                <Calculator className="mr-1.5 h-3 w-3" />
                Costing Engine
              </Badge>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                <Sparkles className="mr-1 h-3 w-3" /> Live
              </Badge>
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Motor de Costeo</h1>
            <p className="text-sm text-muted-foreground">
              Costo de aterrizaje (CIF + DDP), margen objetivo y proyecciones de ingreso por escenario.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedId || ""} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Selecciona un embarque" />
              </SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-mono text-xs">{s.po_number}</span> · {s.supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={persistSnapshot}
              disabled={!selectedId || computing}
              className="gap-2"
            >
              {computing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Guardar Snapshot
            </Button>
          </div>
        </div>

        {!selected ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Ship className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {loading ? "Cargando embarques…" : "Crea un embarque primero para calcular costos."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Strip */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="FOB Total"
                value={fmtUSD(totals.fobUsd)}
                sub={fmtCLP(totals.fobClp)}
                icon={DollarSign}
                tone="primary"
              />
              <KpiCard
                label="Overhead Importación"
                value={fmtCLP(totals.overheadClp)}
                sub={`${fmtPct(totals.overheadPct)} sobre FOB`}
                icon={Ship}
                tone="warning"
              />
              <KpiCard
                label="Landed Cost"
                value={fmtCLP(totals.landedClp)}
                sub={`${totals.totalQty.toLocaleString()} unidades`}
                icon={Package}
                tone="accent"
              />
              <KpiCard
                label="Margen Proyectado"
                value={fmtPct(projection.marginPct)}
                sub={fmtCLP(projection.margin)}
                icon={TrendingUp}
                tone={projection.marginPct >= 40 ? "success" : projection.marginPct >= 20 ? "warning" : "danger"}
              />
            </div>

            {/* Shipment meta */}
            <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
                  Parámetros del Embarque · {selected.po_number}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">FX a CLP</Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={selected.fx_rate_to_clp || 950}
                      onBlur={(e) => updateShipmentMeta({ fx_rate_to_clp: Number(e.target.value) })}
                      className="font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Peso (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      defaultValue={selected.weight_kg || 0}
                      onBlur={(e) => updateShipmentMeta({ weight_kg: Number(e.target.value) })}
                      className="font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Volumen (m³)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={selected.volume_m3 || 0}
                      onBlur={(e) => updateShipmentMeta({ volume_m3: Number(e.target.value) })}
                      className="font-mono tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Método de prorrateo</Label>
                    <Select
                      value={selected.cost_allocation_method}
                      onValueChange={(v: any) => updateShipmentMeta({ cost_allocation_method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ALLOCATION_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-5">
              {/* Cost components */}
              <Card className="lg:col-span-2 border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
                      Componentes de Costo
                    </CardTitle>
                    <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
                      {components.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newComp.category} onValueChange={(v) => setNewComp({ ...newComp, category: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={newComp.currency}
                        onValueChange={(v) => setNewComp({ ...newComp, currency: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="CLP">CLP</SelectItem>
                          <SelectItem value="CNY">CNY</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      placeholder="Descripción (opcional)"
                      value={newComp.description}
                      onChange={(e) => setNewComp({ ...newComp, description: e.target.value })}
                      className="h-9"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Monto"
                        value={newComp.amount}
                        onChange={(e) => setNewComp({ ...newComp, amount: e.target.value })}
                        className="h-9 font-mono tabular-nums"
                      />
                      <Button onClick={addComponent} size="sm" className="gap-1">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                    {components.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Sin componentes. Agrega flete, aduana, seguros…
                      </p>
                    ) : (
                      components.map((c) => {
                        const cat = CATEGORIES.find((x) => x.value === c.category);
                        return (
                          <div
                            key={c.id}
                            className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2 hover:bg-card/80 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{cat?.label || c.category}</span>
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono">
                                  {c.currency}
                                </Badge>
                              </div>
                              {c.description && (
                                <p className="text-[10px] text-muted-foreground truncate">{c.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-mono tabular-nums text-xs font-semibold">
                                {c.currency === "CLP" ? fmtCLP(c.amount) : fmtUSD(c.amount)}
                              </p>
                              <p className="font-mono tabular-nums text-[10px] text-muted-foreground">
                                {fmtCLP(c.amount_clp)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeComponent(c.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <Separator />
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Total Overhead</span>
                    <span className="font-mono tabular-nums text-sm font-bold">{fmtCLP(totals.overheadClp)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Projections */}
              <Card className="lg:col-span-3 border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
                      Proyección de Ingresos
                    </CardTitle>
                    <Tabs value={scenario} onValueChange={(v: any) => setScenario(v)}>
                      <TabsList className="h-8">
                        <TabsTrigger value="pessimistic" className="text-[11px]">
                          Pesimista
                        </TabsTrigger>
                        <TabsTrigger value="base" className="text-[11px]">
                          Base
                        </TabsTrigger>
                        <TabsTrigger value="optimistic" className="text-[11px]">
                          Optimista
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Sliders */}
                  <div className="grid gap-5 md:grid-cols-3">
                    <SliderControl
                      icon={Target}
                      label="Margen objetivo"
                      value={targetMargin[0]}
                      onChange={setTargetMargin}
                      max={90}
                      suffix="%"
                    />
                    <SliderControl
                      icon={Package}
                      label="Sell-through"
                      value={sellThrough[0]}
                      onChange={setSellThrough}
                      max={100}
                      suffix="%"
                    />
                    <SliderControl
                      icon={Percent}
                      label="Descuento promedio"
                      value={discount[0]}
                      onChange={setDiscount}
                      max={70}
                      suffix="%"
                    />
                  </div>

                  {/* Projection KPIs */}
                  <div className="grid gap-3 md:grid-cols-4">
                    <ProjectionStat label="Ingreso esperado" value={fmtCLP(projection.revenue)} primary />
                    <ProjectionStat label="COGS" value={fmtCLP(projection.cogs)} />
                    <ProjectionStat
                      label="Margen bruto"
                      value={fmtCLP(projection.margin)}
                      tone={projection.margin >= 0 ? "success" : "danger"}
                    />
                    <ProjectionStat
                      label="Payback"
                      value={`${projection.paybackMonths.toFixed(1)} meses`}
                      tone={projection.paybackMonths < 6 ? "success" : projection.paybackMonths < 12 ? "warning" : "danger"}
                    />
                  </div>

                  {/* Scenario summary */}
                  <div className="rounded-lg border border-border/40 bg-gradient-to-br from-muted/30 to-transparent p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Escenario {scenario}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sell-through efectivo <strong className="text-foreground tabular-nums">{fmtPct(projection.effectiveSellThrough)}</strong>, descuento aplicado{" "}
                      <strong className="text-foreground tabular-nums">{fmtPct(projection.effectiveDiscount)}</strong>. ROI esperado en{" "}
                      <strong className="text-foreground tabular-nums">{projection.paybackMonths.toFixed(1)} meses</strong>{" "}
                      asumiendo ventana de venta de 6 meses.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Per-line landed cost */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
                    Landed Cost por SKU
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    Prorrateo: {ALLOCATION_LABELS[selected.cost_allocation_method]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                        <TableHead className="text-right">FOB U</TableHead>
                        <TableHead className="text-right">Overhead U</TableHead>
                        <TableHead className="text-right font-bold">Landed U</TableHead>
                        <TableHead className="text-right">Precio Actual</TableHead>
                        <TableHead className="text-right">Sugerido</TableHead>
                        <TableHead className="text-right">Margen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                            Embarque sin items.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lines.map((l) => (
                          <TableRow key={l.id} className="font-mono tabular-nums text-xs">
                            <TableCell className="font-sans">
                              <div className="flex flex-col">
                                <span className="font-semibold">{l.sku?.sku_code}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {l.sku?.name} · {l.sku?.color}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{l.quantity}</TableCell>
                            <TableCell className="text-right">{fmtUSD(l.unitFobUsd)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {fmtCLP(l.quantity > 0 ? l.allocOverheadClp / l.quantity : 0)}
                            </TableCell>
                            <TableCell className="text-right font-bold">{fmtCLP(l.unitLandedClp)}</TableCell>
                            <TableCell className="text-right">{fmtCLP(l.currentRetail)}</TableCell>
                            <TableCell className="text-right text-primary">{fmtCLP(l.suggestedRetail)}</TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={l.marginAtCurrent >= 40 ? "secondary" : "destructive"}
                                    className={cn(
                                      "tabular-nums text-[10px]",
                                      l.marginAtCurrent >= 40
                                        ? "bg-success/15 text-success"
                                        : l.marginAtCurrent >= 20
                                          ? "bg-warning/15 text-warning-foreground"
                                          : ""
                                    )}
                                  >
                                    {fmtPct(l.marginAtCurrent)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Margen al precio actual ({fmtCLP(l.currentRetail)})
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  tone?: "primary" | "warning" | "accent" | "success" | "danger";
}) {
  const toneMap = {
    primary: "from-primary/15 to-primary/5 text-primary",
    warning: "from-warning/15 to-warning/5 text-warning-foreground",
    accent: "from-accent/30 to-accent/10 text-accent-foreground",
    success: "from-success/15 to-success/5 text-success",
    danger: "from-destructive/15 to-destructive/5 text-destructive",
  };
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/40 backdrop-blur-sm hover:border-border transition-colors">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", toneMap[tone])} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-2 font-heading text-2xl font-bold tabular-nums">{value}</p>
            {sub && <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">{sub}</p>}
          </div>
          <div className={cn("rounded-lg p-2 bg-background/60 backdrop-blur", toneMap[tone].split(" ").pop())}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SliderControl({
  icon: Icon,
  label,
  value,
  onChange,
  max,
  suffix,
}: {
  icon: any;
  label: string;
  value: number;
  onChange: (v: number[]) => void;
  max: number;
  suffix: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Label>
        <span className="font-mono tabular-nums text-xs font-bold text-primary">
          {value}
          {suffix}
        </span>
      </div>
      <Slider value={[value]} onValueChange={onChange} max={max} step={1} />
    </div>
  );
}

function ProjectionStat({
  label,
  value,
  primary,
  tone,
}: {
  label: string;
  value: string;
  primary?: boolean;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning-foreground"
        : tone === "danger"
          ? "text-destructive"
          : primary
            ? "text-primary"
            : "text-foreground";
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-heading font-bold tabular-nums text-lg", toneClass)}>{value}</p>
    </div>
  );
}
