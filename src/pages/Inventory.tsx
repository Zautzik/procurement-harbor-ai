import { useState } from "react";
import { Search, Grid3X3, Table as TableIcon, Download, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { skus } from "@/data/mockData";
import { cn } from "@/lib/utils";

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

  const filtered = skus.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase());
    const matchFabric = fabricFilter === "all" || s.fabric === fabricFilter;
    return matchSearch && matchFabric;
  });

  const fabrics = [...new Set(skus.map((s) => s.fabric))];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">{skus.length} SKUs · {skus.reduce((s, i) => s + i.stock, 0)} rollos totales</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" />Importar</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Exportar</Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo SKU</Button>
        </div>
      </div>

      {/* Filters */}
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

      {/* Table View */}
      {view === "table" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
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
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="text-lg">{item.image}</TableCell>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.fabric}</TableCell>
                    <TableCell>{item.color}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.stock} {stockBadge(item.stock)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{item.location}</TableCell>
                    <TableCell className={cn("text-right font-semibold", trendColor(item.trendScore))}>
                      {item.trendScore}
                    </TableCell>
                    <TableCell className="text-right">${item.price.toLocaleString()}</TableCell>
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
                <div className="text-3xl mb-2">{item.image}</div>
                <p className="font-mono text-[10px] text-muted-foreground">{item.sku}</p>
                <p className="font-medium text-sm mt-0.5">{item.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">{item.stock} rollos</span>
                  {stockBadge(item.stock)}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{item.fabric}</span>
                  <span className={cn("text-xs font-semibold", trendColor(item.trendScore))}>
                    ⬆ {item.trendScore}
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
