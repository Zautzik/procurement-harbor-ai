import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ShipmentForm({ trigger, onCreated }: { trigger: React.ReactNode; onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    po_number: "", supplier: "", status: "ordered", value: 0, eta: "", item_count: 0, notes: "",
  });

  const submit = async () => {
    if (!form.po_number || !form.supplier) return toast.error("PO y proveedor obligatorios");
    setLoading(true);
    const payload: any = { ...form };
    if (!payload.eta) delete payload.eta;
    const { error } = await supabase.from("shipments").insert(payload);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Embarque creado");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({ action: "create_shipment", entity_type: "shipment", details: form, user_id: user?.id });
    setOpen(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo Embarque</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>PO Number *</Label><Input value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} /></div>
          <div><Label>Proveedor *</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
          <div>
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ordered">Ordenado</SelectItem>
                <SelectItem value="production">En Producción</SelectItem>
                <SelectItem value="shipped">Embarcado</SelectItem>
                <SelectItem value="customs">En Aduana</SelectItem>
                <SelectItem value="warehouse">En Bodega</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>ETA</Label><Input type="date" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} /></div>
          <div><Label>Valor USD</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
          <div><Label>Items</Label><Input type="number" value={form.item_count} onChange={(e) => setForm({ ...form, item_count: Number(e.target.value) })} /></div>
          <div className="col-span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Guardando..." : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
