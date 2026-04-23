import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Sku = { id: string; sku_code: string; name: string; price_clp: number | null };
type Client = { id: string; name: string };
type Warehouse = { id: string; name: string; code: string; is_default: boolean };
type StockRow = { sku_id: string; warehouse_id: string; quantity: number; reserved: number };
type Item = { sku_id: string; quantity: number; unit_price: number };

export function OrderForm({ trigger, onCreated }: { trigger: React.ReactNode; onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<Item[]>([{ sku_id: "", quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState("");
  const [confirmAndReserve, setConfirmAndReserve] = useState(true);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase.from("skus").select("id, sku_code, name, price_clp"),
      supabase.from("clients").select("id, name"),
      supabase.from("warehouses").select("id, name, code, is_default").eq("active", true).order("is_default", { ascending: false }),
      supabase.from("stock_by_warehouse").select("sku_id, warehouse_id, quantity, reserved"),
    ]).then(([s, c, w, st]) => {
      setSkus((s.data as Sku[]) || []);
      setClients((c.data as Client[]) || []);
      const whs = (w.data as Warehouse[]) || [];
      setWarehouses(whs);
      setStockRows((st.data as StockRow[]) || []);
      if (!warehouseId && whs.length) setWarehouseId(whs.find(x => x.is_default)?.id || whs[0].id);
    });
  }, [open]);

  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const availableFor = (skuId: string) => {
    if (!skuId || !warehouseId) return null;
    const row = stockRows.find(r => r.sku_id === skuId && r.warehouse_id === warehouseId);
    if (!row) return 0;
    return Math.max(0, row.quantity - row.reserved);
  };

  const stockIssues = items
    .map((it, idx) => {
      if (!it.sku_id) return null;
      const avail = availableFor(it.sku_id);
      if (avail === null) return null;
      if (it.quantity > avail) {
        const sku = skus.find(s => s.id === it.sku_id);
        return { idx, msg: `${sku?.sku_code}: pides ${it.quantity}, disponible ${avail}` };
      }
      return null;
    })
    .filter(Boolean) as { idx: number; msg: string }[];

  const submit = async () => {
    if (!clientId) return toast.error("Selecciona un cliente");
    if (items.some((i) => !i.sku_id)) return toast.error("Selecciona SKUs en todas las líneas");
    if (confirmAndReserve && !warehouseId) return toast.error("Selecciona una bodega para reservar stock");
    if (confirmAndReserve && stockIssues.length > 0) return toast.error(`Stock insuficiente: ${stockIssues[0].msg}`);

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: order, error } = await supabase.from("orders").insert({
      client_id: clientId,
      status: confirmAndReserve ? "confirmado" : "borrador",
      total, notes, created_by: user?.id,
    }).select().single();
    if (error) { setLoading(false); return toast.error(error.message); }

    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({ order_id: order.id, sku_id: i.sku_id, quantity: i.quantity, unit_price: i.unit_price }))
    );
    if (itemsErr) { setLoading(false); return toast.error(itemsErr.message); }

    // Atomic reservations
    if (confirmAndReserve) {
      const reservationIds: string[] = [];
      let reservationError: string | null = null;
      for (const it of items) {
        const { data: resId, error: resErr } = await supabase.rpc("reserve_stock", {
          _sku_id: it.sku_id,
          _warehouse_id: warehouseId,
          _quantity: it.quantity,
          _order_id: order.id,
          _expires_minutes: 1440, // 24h hold
        });
        if (resErr) { reservationError = resErr.message; break; }
        if (resId) reservationIds.push(resId as string);
      }

      if (reservationError) {
        // Rollback: release any reservations made, revert order to borrador
        for (const rid of reservationIds) {
          await supabase.rpc("release_reservation", { _reservation_id: rid });
        }
        await supabase.from("orders").update({ status: "borrador" }).eq("id", order.id);
        setLoading(false);
        return toast.error(`Reserva fallida: ${reservationError}. Pedido guardado como borrador.`);
      }
    }

    await supabase.from("audit_log").insert({
      action: confirmAndReserve ? "create_order_confirmed" : "create_order",
      entity_type: "order", entity_id: order.id,
      details: { total, items, warehouse_id: confirmAndReserve ? warehouseId : null, reserved: confirmAndReserve },
      user_id: user?.id,
    });
    setLoading(false);
    toast.success(confirmAndReserve ? "Pedido confirmado y stock reservado" : "Pedido creado (borrador)");
    setOpen(false);
    setItems([{ sku_id: "", quantity: 1, unit_price: 0 }]);
    setClientId("");
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo Pedido</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bodega de despacho</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar bodega" /></SelectTrigger>
                <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Líneas</Label>
            {items.map((it, idx) => {
              const avail = availableFor(it.sku_id);
              const issue = stockIssues.find(s => s.idx === idx);
              return (
                <div key={idx} className="space-y-1">
                  <div className="grid grid-cols-[2fr_80px_120px_70px_40px] gap-2 items-center">
                    <Select value={it.sku_id} onValueChange={(v) => {
                      const sku = skus.find((s) => s.id === v);
                      setItems(items.map((x, i) => i === idx ? { ...x, sku_id: v, unit_price: sku?.price_clp || 0 } : x));
                    }}>
                      <SelectTrigger><SelectValue placeholder="SKU" /></SelectTrigger>
                      <SelectContent>{skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.sku_code} — {s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min={1} value={it.quantity} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                    <Input type="number" value={it.unit_price} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))} />
                    <div className="text-xs text-muted-foreground text-center">
                      {it.sku_id && avail !== null ? (
                        <span className={issue ? "text-destructive font-semibold" : ""}>Disp: {avail}</span>
                      ) : "—"}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {issue && (
                    <div className="text-xs text-destructive flex items-center gap-1 pl-1">
                      <AlertCircle className="h-3 w-3" />{issue.msg}
                    </div>
                  )}
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { sku_id: "", quantity: 1, unit_price: 0 }])}>
              <Plus className="h-3 w-3 mr-1" />Línea
            </Button>
          </div>

          <div><Label>Notas</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          <div className="flex items-center justify-between rounded-md border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="confirm-reserve" className="text-sm">Confirmar y reservar stock ahora</Label>
              <p className="text-xs text-muted-foreground">Bloquea el inventario en la bodega seleccionada por 24h.</p>
            </div>
            <Switch id="confirm-reserve" checked={confirmAndReserve} onCheckedChange={setConfirmAndReserve} />
          </div>

          <div className="text-right text-lg font-bold">Total: ${total.toLocaleString("es-CL")} CLP</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading || (confirmAndReserve && stockIssues.length > 0)}>
            {loading ? "Guardando..." : confirmAndReserve ? "Confirmar y reservar" : "Crear borrador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
