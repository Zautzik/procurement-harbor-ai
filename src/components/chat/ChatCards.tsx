import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Ship } from "lucide-react";

export type ParsedPart =
  | { kind: "text"; content: string }
  | { kind: "sku"; data: any }
  | { kind: "shipment"; data: any };

export function parseChatContent(content: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const re = /```card:(sku|shipment)\s*\n([\s\S]*?)```/g;
  let lastIdx = 0;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIdx) parts.push({ kind: "text", content: content.slice(lastIdx, m.index) });
    try {
      parts.push({ kind: m[1] as any, data: JSON.parse(m[2].trim()) });
    } catch { /* ignore */ }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < content.length) parts.push({ kind: "text", content: content.slice(lastIdx) });
  return parts.length ? parts : [{ kind: "text", content }];
}

export function SkuCard({ d }: { d: any }) {
  return (
    <Card className="p-3 my-2 flex items-center gap-3 bg-muted/40">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Package className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{d.sku_code}</span>
          <span className="font-semibold text-sm truncate">{d.name}</span>
        </div>
        <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
          <span>Stock: <b className={d.stock < 15 ? "text-destructive" : "text-foreground"}>{d.stock}</b></span>
          {d.location && <span>📍 {d.location}</span>}
          {d.price_clp != null && <span>${Number(d.price_clp).toLocaleString()} CLP</span>}
        </div>
      </div>
    </Card>
  );
}

export function ShipmentCard({ d }: { d: any }) {
  return (
    <Card className="p-3 my-2 flex items-center gap-3 bg-muted/40">
      <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0">
        <Ship className="h-5 w-5 text-chart-2" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{d.po_number}</span>
          <span className="font-semibold text-sm truncate">{d.supplier}</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">{d.status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">ETA: {d.eta || "—"}</div>
      </div>
    </Card>
  );
}
