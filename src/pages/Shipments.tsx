import { useEffect, useState } from "react";
import { Ship, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { cn } from "@/lib/utils";
import { ShipmentForm } from "@/components/forms/ShipmentForm";
import { ShipmentDetail } from "@/components/shipments/ShipmentDetail";
import { DndContext, useDraggable, useDroppable, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { toast } from "sonner";

type ShipmentStatus = "ordered" | "production" | "shipped" | "customs" | "warehouse";

type Shipment = {
  id: string; po_number: string; supplier: string; status: ShipmentStatus;
  value: number | null; eta: string | null; item_count: number | null;
};

const columns: { key: ShipmentStatus; label: string; emoji: string; color: string }[] = [
  { key: "ordered", label: "Ordenado", emoji: "📝", color: "border-t-muted-foreground" },
  { key: "production", label: "En Producción", emoji: "🏭", color: "border-t-chart-3" },
  { key: "shipped", label: "Embarcado", emoji: "🌊", color: "border-t-chart-2" },
  { key: "customs", label: "En Aduana", emoji: "🛃", color: "border-t-accent" },
  { key: "warehouse", label: "En Bodega", emoji: "✅", color: "border-t-primary" },
];

function DraggableCard({ s, color, onClick }: { s: Shipment; color: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: s.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 } : undefined;
  return (
    <Card ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick} className={cn("border-t-2 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing", color)}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold">{s.po_number}</span>
          <Ship className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{s.supplier}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{s.item_count || 0} ítems</span>
          <span>${((s.value || 0) / 1000000).toFixed(1)}M</span>
        </div>
        <div className="text-xs text-muted-foreground">ETA: <span className="font-medium text-foreground">{s.eta || "—"}</span></div>
      </CardContent>
    </Card>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={cn("space-y-3 min-h-[120px] rounded-lg p-1 transition-colors", isOver && "bg-primary/5 ring-2 ring-primary/30")}>{children}</div>;
}

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = () => {
    supabase.from("shipments").select("*").order("created_at", { ascending: false }).then(({ data }) => setShipments((data as Shipment[]) || []));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel("shipments-rt").on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleDragEnd = async (e: DragEndEvent) => {
    const id = e.active.id as string;
    const newStatus = e.over?.id as ShipmentStatus | undefined;
    if (!newStatus) return;
    const ship = shipments.find((s) => s.id === id);
    if (!ship || ship.status === newStatus) return;
    setShipments((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus } : s));
    const { error } = await supabase.from("shipments").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error(error.message); load(); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({ action: "status_change", entity_type: "shipment", entity_id: id, user_id: user?.id, performed_by: "human", details: { from: ship.status, to: newStatus } });
    toast.success(`${ship.po_number} → ${newStatus}`);
  };

  const handleExport = () => {
    exportToCsv("embarques", shipments.map((s) => ({ PO: s.po_number, Proveedor: s.supplier, Estado: s.status, Valor: s.value, ETA: s.eta, Items: s.item_count })));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Embarques</h1>
          <p className="text-sm text-muted-foreground">{shipments.length} embarques · arrastra para cambiar estado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Exportar CSV</Button>
          <ShipmentForm trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo Embarque</Button>} onCreated={load} />
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {columns.map((col) => {
            const items = shipments.filter((s) => s.status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span>{col.emoji}</span>
                  <span className="text-sm font-heading font-semibold">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{items.length}</Badge>
                </div>
                <DroppableColumn id={col.key}>
                  {items.map((s) => <DraggableCard key={s.id} s={s} color={col.color} onClick={() => setSelected(s)} />)}
                  {items.length === 0 && <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">Suelta aquí</div>}
                </DroppableColumn>
              </div>
            );
          })}
        </div>
      </DndContext>

      <ShipmentDetail shipment={selected} open={!!selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
