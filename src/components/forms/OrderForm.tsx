import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Sku = { id: string; sku_code: string; name: string; price_clp: number | null };
type Client = { id: string; name: string };
type Item = { sku_id: string; quantity: number; unit_price: number };

export function OrderForm({ trigger, onCreated }: { trigger: React.ReactNode; onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<Item[]>([{ sku_id: "", quantity: 1, unit_price: 0 }]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase.from("skus").select("id, sku_code, name, price_clp").then(({ data }) => setSkus((data as Sku[]) || []));
    supabase.from("clients").select("id, name").then(({ data }) => setClients((data as Client[]) || []));
  }, [open]);

  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const submit = async () => {
    if (!clientId) return toast.error("Selecciona un cliente");
    if (items.some((i) => !i.sku_id)) return toast.error("Selecciona SKUs en todas las líneas");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: order, error } = await supabase.from("orders").insert({
      client_id: clientId, status: "borrador", total, notes, created_by: user?.id,
    }).select().single();
    if (error) { setLoading(false); return toast.error(error.message); }
    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({ order_id: order.id, sku_id: i.sku_id, quantity: i.quantity, unit_price: i.unit_price }))
    );
    setLoading(false);
    if (itemsErr) return toast.error(itemsErr.message);
    await supabase.from("audit_log").insert({ action: "create_order", entity_type: "order", entity_id: order.id, details: { total, items }, user_id: user?.id });
    toast.success("Pedido creado");
    setOpen(false);
    setItems([{ sku_id: "", quantity: 1, unit_price: 0 }]);
    setClientId("");
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nuevo Pedido</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Líneas</Label>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_80px_120px_40px] gap-2">
                <Select value={it.sku_id} onValueChange={(v) => {
                  const sku = skus.find((s) => s.id === v);
                  setItems(items.map((x, i) => i === idx ? { ...x, sku_id: v, unit_price: sku?.price_clp || 0 } : x));
                }}>
                  <SelectTrigger><SelectValue placeholder="SKU" /></SelectTrigger>
                  <SelectContent>{skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.sku_code} — {s.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={it.quantity} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                <Input type="number" value={it.unit_price} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))} />
                <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { sku_id: "", quantity: 1, unit_price: 0 }])}>
              <Plus className="h-3 w-3 mr-1" />Línea
            </Button>
          </div>
          <div><Label>Notas</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="text-right text-lg font-bold">Total: ${total.toLocaleString("es-CL")} CLP</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Guardando..." : "Crear pedido"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
