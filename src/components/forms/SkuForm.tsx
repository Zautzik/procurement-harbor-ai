import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SkuForm({ trigger, onCreated }: { trigger: React.ReactNode; onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sku_code: "", name: "", fabric: "", color: "", size: "",
    stock: 0, location: "", cost_usd: 0, price_clp: 0, trend_score: 50,
  });

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.sku_code || !form.name) {
      toast.error("SKU y nombre son obligatorios");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("skus").insert(form as any);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("SKU creado");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      action: "create_sku", entity_type: "sku", details: form, user_id: user?.id,
    });
    setOpen(false);
    setForm({ sku_code: "", name: "", fabric: "", color: "", size: "", stock: 0, location: "", cost_usd: 0, price_clp: 0, trend_score: 50 });
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuevo SKU</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Código SKU *</Label><Input value={form.sku_code} onChange={(e) => update("sku_code", e.target.value)} /></div>
          <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
          <div><Label>Tela</Label><Input value={form.fabric} onChange={(e) => update("fabric", e.target.value)} /></div>
          <div><Label>Color</Label><Input value={form.color} onChange={(e) => update("color", e.target.value)} /></div>
          <div><Label>Talla / Ancho</Label><Input value={form.size} onChange={(e) => update("size", e.target.value)} /></div>
          <div><Label>Ubicación</Label><Input value={form.location} onChange={(e) => update("location", e.target.value)} /></div>
          <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => update("stock", Number(e.target.value))} /></div>
          <div><Label>Trend Score (0-100)</Label><Input type="number" value={form.trend_score} onChange={(e) => update("trend_score", Number(e.target.value))} /></div>
          <div><Label>Costo USD</Label><Input type="number" step="0.01" value={form.cost_usd} onChange={(e) => update("cost_usd", Number(e.target.value))} /></div>
          <div><Label>Precio CLP</Label><Input type="number" value={form.price_clp} onChange={(e) => update("price_clp", Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Guardando..." : "Crear SKU"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
