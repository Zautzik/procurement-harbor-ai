import { useEffect, useState } from "react";
import { Ship, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { cn } from "@/lib/utils";

type ShipmentStatus = "ordered" | "production" | "shipped" | "customs" | "warehouse";

type Shipment = {
  id: string;
  po_number: string;
  supplier: string;
  status: ShipmentStatus;
  value: number | null;
  eta: string | null;
  item_count: number | null;
};

const columns: { key: ShipmentStatus; label: string; emoji: string; color: string }[] = [
  { key: "ordered", label: "Ordenado", emoji: "📝", color: "border-t-muted-foreground" },
  { key: "production", label: "En Producción", emoji: "🏭", color: "border-t-chart-3" },
  { key: "shipped", label: "Embarcado", emoji: "🌊", color: "border-t-chart-2" },
  { key: "customs", label: "En Aduana", emoji: "🛃", color: "border-t-accent" },
  { key: "warehouse", label: "En Bodega", emoji: "✅", color: "border-t-primary" },
];

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    supabase.from("shipments").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setShipments((data as Shipment[]) || []);
    });
  }, []);

  const handleExport = () => {
    exportToCsv("embarques", shipments.map((s) => ({
      PO: s.po_number, Proveedor: s.supplier, Estado: s.status,
      Valor: s.value, ETA: s.eta, Items: s.item_count,
    })));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Embarques</h1>
          <p className="text-sm text-muted-foreground">{shipments.length} embarques activos</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Exportar CSV</Button>
      </div>

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
              <div className="space-y-3 min-h-[120px]">
                {items.map((s) => (
                  <Card key={s.id} className={cn("border-t-2 hover:shadow-md transition-shadow cursor-pointer", col.color)}>
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
                      <div className="text-xs text-muted-foreground">
                        ETA: <span className="font-medium text-foreground">{s.eta || "—"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                    Sin embarques
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
