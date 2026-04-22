import { useEffect, useState } from "react";
import { Plus, Warehouse as WhIcon, ArrowRightLeft, History, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Warehouse = { id: string; code: string; name: string; city: string | null; is_default: boolean; active: boolean };
type StockRow = { id: string; sku_id: string; warehouse_id: string; quantity: number; reserved: number; reorder_point: number | null; sku?: { sku_code: string; name: string; fabric: string }; warehouse?: { name: string; code: string } };
type Movement = { id: string; sku_id: string; warehouse_id: string; movement_type: string; quantity: number; reason: string | null; created_at: string; notes: string | null; sku?: { sku_code: string; name: string }; warehouse?: { name: string } };

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  // New warehouse dialog
  const [newWh, setNewWh] = useState({ code: "", name: "", city: "" });
  const [whOpen, setWhOpen] = useState(false);

  // Movement dialog
  const [movOpen, setMovOpen] = useState(false);
  const [mov, setMov] = useState({ sku_id: "", warehouse_id: "", movement_type: "in", quantity: 0, reason: "", to_warehouse_id: "", notes: "" });
  const [skus, setSkus] = useState<{ id: string; sku_code: string; name: string }[]>([]);

  const loadAll = async () => {
    setLoading(true);
    const [whRes, stockRes, movRes, skuRes] = await Promise.all([
      supabase.from("warehouses").select("*").order("is_default", { ascending: false }).order("name"),
      supabase.from("stock_by_warehouse").select("*, sku:skus(sku_code, name, fabric), warehouse:warehouses(name, code)").order("updated_at", { ascending: false }).limit(200),
      supabase.from("stock_movements").select("*, sku:skus(sku_code, name), warehouse:warehouses(name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("skus").select("id, sku_code, name").order("sku_code").limit(500),
    ]);
    setWarehouses((whRes.data as any) || []);
    setStock((stockRes.data as any) || []);
    setMovements((movRes.data as any) || []);
    setSkus((skuRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const createWarehouse = async () => {
    if (!newWh.code || !newWh.name) return toast.error("Código y nombre requeridos");
    const { error } = await supabase.from("warehouses").insert(newWh);
    if (error) return toast.error(error.message);
    toast.success("Bodega creada");
    setWhOpen(false); setNewWh({ code: "", name: "", city: "" });
    loadAll();
  };

  const submitMovement = async () => {
    if (!mov.sku_id || !mov.warehouse_id || !mov.quantity) return toast.error("SKU, bodega y cantidad requeridos");
    const user = (await supabase.auth.getUser()).data.user;

    // Insert movement record
    const { error: movErr } = await supabase.from("stock_movements").insert({
      sku_id: mov.sku_id, warehouse_id: mov.warehouse_id, movement_type: mov.movement_type,
      quantity: mov.quantity, reason: mov.reason || null, notes: mov.notes || null,
      to_warehouse_id: mov.movement_type === "transfer" ? mov.to_warehouse_id : null,
      performed_by: user?.id,
    });
    if (movErr) return toast.error(movErr.message);

    // Apply to stock_by_warehouse
    const { data: existing } = await supabase.from("stock_by_warehouse")
      .select("id, quantity").eq("sku_id", mov.sku_id).eq("warehouse_id", mov.warehouse_id).maybeSingle();

    const delta = mov.movement_type === "in" || mov.movement_type === "adjustment" ? mov.quantity
      : mov.movement_type === "out" || mov.movement_type === "transfer" ? -mov.quantity : 0;

    if (existing) {
      await supabase.from("stock_by_warehouse").update({ quantity: existing.quantity + delta, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else if (delta > 0) {
      await supabase.from("stock_by_warehouse").insert({ sku_id: mov.sku_id, warehouse_id: mov.warehouse_id, quantity: delta });
    }

    // If transfer, add inbound to destination
    if (mov.movement_type === "transfer" && mov.to_warehouse_id) {
      const { data: dest } = await supabase.from("stock_by_warehouse")
        .select("id, quantity").eq("sku_id", mov.sku_id).eq("warehouse_id", mov.to_warehouse_id).maybeSingle();
      if (dest) {
        await supabase.from("stock_by_warehouse").update({ quantity: dest.quantity + mov.quantity }).eq("id", dest.id);
      } else {
        await supabase.from("stock_by_warehouse").insert({ sku_id: mov.sku_id, warehouse_id: mov.to_warehouse_id, quantity: mov.quantity });
      }
      await supabase.from("stock_movements").insert({
        sku_id: mov.sku_id, warehouse_id: mov.to_warehouse_id, movement_type: "in",
        quantity: mov.quantity, reason: `Transferencia desde bodega`, performed_by: user?.id,
      });
    }

    toast.success("Movimiento registrado");
    setMovOpen(false);
    setMov({ sku_id: "", warehouse_id: "", movement_type: "in", quantity: 0, reason: "", to_warehouse_id: "", notes: "" });
    loadAll();
  };

  const movIcon = (t: string) => {
    if (t === "in") return <TrendingUp className="h-3 w-3 text-primary" />;
    if (t === "out") return <TrendingDown className="h-3 w-3 text-destructive" />;
    if (t === "transfer") return <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />;
    return <History className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <WhIcon className="h-6 w-6 text-primary" /> Bodegas & Kardex
          </h1>
          <p className="text-sm text-muted-foreground">Multi-bodega · movimientos · reservas</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={whOpen} onOpenChange={setWhOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Bodega</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva bodega</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Código</Label><Input value={newWh.code} onChange={e => setNewWh({ ...newWh, code: e.target.value.toUpperCase() })} placeholder="BOD-2" /></div>
                <div><Label>Nombre</Label><Input value={newWh.name} onChange={e => setNewWh({ ...newWh, name: e.target.value })} placeholder="Bodega Norte" /></div>
                <div><Label>Ciudad</Label><Input value={newWh.city} onChange={e => setNewWh({ ...newWh, city: e.target.value })} placeholder="Antofagasta" /></div>
              </div>
              <DialogFooter><Button onClick={createWarehouse}>Crear</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={movOpen} onOpenChange={setMovOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Movimiento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar movimiento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={mov.movement_type} onValueChange={v => setMov({ ...mov, movement_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Salida</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="adjustment">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>SKU</Label>
                  <Select value={mov.sku_id} onValueChange={v => setMov({ ...mov, sku_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar SKU" /></SelectTrigger>
                    <SelectContent>{skus.map(s => <SelectItem key={s.id} value={s.id}>{s.sku_code} — {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{mov.movement_type === "transfer" ? "Bodega origen" : "Bodega"}</Label>
                  <Select value={mov.warehouse_id} onValueChange={v => setMov({ ...mov, warehouse_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar bodega" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {mov.movement_type === "transfer" && (
                  <div>
                    <Label>Bodega destino</Label>
                    <Select value={mov.to_warehouse_id} onValueChange={v => setMov({ ...mov, to_warehouse_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Destino" /></SelectTrigger>
                      <SelectContent>{warehouses.filter(w => w.id !== mov.warehouse_id).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Cantidad</Label><Input type="number" value={mov.quantity || ""} onChange={e => setMov({ ...mov, quantity: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>Motivo</Label><Input value={mov.reason} onChange={e => setMov({ ...mov, reason: e.target.value })} placeholder="Recepción OC-123, venta, merma…" /></div>
                <div><Label>Notas</Label><Textarea value={mov.notes} onChange={e => setMov({ ...mov, notes: e.target.value })} rows={2} /></div>
              </div>
              <DialogFooter><Button onClick={submitMovement}>Registrar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bodegas</p><p className="text-2xl font-heading font-bold">{warehouses.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Posiciones stock</p><p className="text-2xl font-heading font-bold">{stock.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unidades totales</p><p className="text-2xl font-heading font-bold">{stock.reduce((s, r) => s + r.quantity, 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Reservadas</p><p className="text-2xl font-heading font-bold text-warning">{stock.reduce((s, r) => s + r.reserved, 0)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock por bodega</TabsTrigger>
          <TabsTrigger value="kardex">Kardex (movimientos)</TabsTrigger>
          <TabsTrigger value="warehouses">Bodegas</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead><TableHead>Bodega</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Reorden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map(s => {
                    const avail = s.quantity - s.reserved;
                    const low = s.reorder_point && avail <= s.reorder_point;
                    return (
                      <TableRow key={s.id}>
                        <TableCell><div className="font-mono text-xs">{s.sku?.sku_code}</div><div className="text-xs text-muted-foreground">{s.sku?.name}</div></TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{s.warehouse?.code}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{s.quantity}</TableCell>
                        <TableCell className="text-right text-warning">{s.reserved}</TableCell>
                        <TableCell className={`text-right font-medium ${low ? "text-destructive" : ""}`}>{avail}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{s.reorder_point || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {stock.length === 0 && !loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin stock registrado</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kardex">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>SKU</TableHead>
                    <TableHead>Bodega</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{new Date(m.created_at).toLocaleString("es-CL")}</TableCell>
                      <TableCell><div className="flex items-center gap-1 text-xs">{movIcon(m.movement_type)}{m.movement_type}</div></TableCell>
                      <TableCell className="font-mono text-xs">{m.sku?.sku_code}</TableCell>
                      <TableCell className="text-xs">{m.warehouse?.name}</TableCell>
                      <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.reason || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {movements.length === 0 && !loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Ciudad</TableHead><TableHead>Default</TableHead><TableHead>Estado</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.map(w => (
                    <TableRow key={w.id}>
                      <TableCell><Badge variant="outline" className="font-mono text-[10px]">{w.code}</Badge></TableCell>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{w.city || "—"}</TableCell>
                      <TableCell>{w.is_default && <Badge className="text-[10px]">Principal</Badge>}</TableCell>
                      <TableCell>{w.active ? <Badge variant="secondary" className="text-[10px]">Activa</Badge> : <Badge variant="destructive" className="text-[10px]">Inactiva</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
