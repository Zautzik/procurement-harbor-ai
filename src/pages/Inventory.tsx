import { useEffect, useState } from "react";
import { Search, Grid3X3, Table as TableIcon, Download, Upload, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/exportCsv";
import { cn } from "@/lib/utils";

type SKU = {
  id: string;
  sku_code: string;
  name: string;
  fabric: string;
  color: string;
  size: string | null;
  stock: number;
  location: string | null;
  trend_score: number | null;
  price_clp: number | null;
};

function trendColor(score: number) {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-chart-3";
  return "text-destructive";
}

function stockBadge(stock: number) {
  if (stock < 15) return <Badge variant="destructive" className="text-[10px]">Bajo</Badge>;
  if (stock < 30) return <Badge className="text-[10px] bg-warning text-warning-foreground">Medio</Badge>;
  return <Badge variant="secondary" className="text-[10px]">OK</Badge>;
}

export default function Inventory() {
  const [view, setView] = useState<"grid" | "table">("table");
  const [search, setSearch] = useState("");
  const [fabricFilter, setFabricFilter] = useState("all");
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string; field: keyof SKU } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("skus").select("*").order("sku_code");
    if (error) toast.error("Error al cargar SKUs");
    setSkus((data as SKU[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = skus.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || s.sku_code.toLowerCase().includes(q);
    const matchFabric = fabricFilter === "all" || s.fabric === fabricFilter;
    return matchSearch && matchFabric;
  });

  const fabrics = [...new Set(skus.map((s) => s.fabric).filter(Boolean))];

  const startEdit = (id: string, field: keyof SKU, current: any) => {
    setEditing({ id, field });
    setEditValue(String(current ?? ""));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { id, field } = editing;
    const numeric = ["stock", "trend_score", "price_clp"].includes(field as string);
    const value: any = numeric ? Number(editValue) : editValue;
    const { error } = await supabase.from("skus").update({ [field]: value } as any).eq("id", id);
    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Guardado");
      setSkus((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
      await supabase.from("audit_log").insert({
        action: "update_sku",
        entity_type: "sku",
        entity_id: id,
        details: { field, value },
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });
    }
    setEditing(null);
  };

  const handleExport = () => {
    exportToCsv("inventario", filtered.map((s) => ({
      SKU: s.sku_code,
      Nombre: s.name,
      Tela: s.fabric,
      Color: s.color,
      Talla: s.size,
      Stock: s.stock,
      Ubicacion: s.location,
      TrendScore: s.trend_score,
      Precio_CLP: s.price_clp,
    })));
  };

  const renderCell = (item: SKU, field: keyof SKU, display: any) => {
    const isEditing = editing?.id === item.id && editing.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") setEditing(null);
            }}
            className="h-7 text-xs"
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}><Check className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(null)}><X className="h-3 w-3" /></Button>
        </div>
      );
    }
    return <span onClick={() => startEdit(item.id, field, item[field])} className="cursor-text hover:bg-muted/50 px-1 rounded block">{display}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">{skus.length} SKUs · {skus.reduce((s, i) => s + i.stock, 0)} rollos totales</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" />Importar</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Exportar CSV</Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo SKU</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar SKU o nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={fabricFilter} onValueChange={setFabricFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tela" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las telas</SelectItem>
            {fabrics.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button variant={view === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setView("table")}>
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setView("grid")}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Cargando inventario...</CardContent></Card>
      ) : view === "table" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tela</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">{item.sku_code}</TableCell>
                    <TableCell className="font-medium">{renderCell(item, "name", item.name)}</TableCell>
                    <TableCell>{item.fabric}</TableCell>
                    <TableCell>{item.color}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {renderCell(item, "stock", item.stock)}
                        {stockBadge(item.stock)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{renderCell(item, "location", item.location)}</TableCell>
                    <TableCell className={cn("text-right font-semibold", trendColor(item.trend_score || 0))}>
                      {renderCell(item, "trend_score", item.trend_score)}
                    </TableCell>
                    <TableCell className="text-right">{renderCell(item, "price_clp", `$${(item.price_clp || 0).toLocaleString()}`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <p className="font-mono text-[10px] text-muted-foreground">{item.sku_code}</p>
                <p className="font-medium text-sm mt-0.5">{item.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">{item.stock} rollos</span>
                  {stockBadge(item.stock)}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{item.fabric}</span>
                  <span className={cn("text-xs font-semibold", trendColor(item.trend_score || 0))}>
                    ⬆ {item.trend_score}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
