import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Ship, FileText, Trash2, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STAGES = [
  { key: "ordered", label: "Ordenado" },
  { key: "production", label: "Producción" },
  { key: "shipped", label: "Embarcado" },
  { key: "customs", label: "Aduana" },
  { key: "warehouse", label: "Bodega" },
];

export function ShipmentDetail({ shipment, open, onClose, onChanged }: { shipment: any; open: boolean; onClose: () => void; onChanged: () => void }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [docType, setDocType] = useState("BL");

  const loadDocs = async () => {
    if (!shipment) return;
    const { data } = await supabase.from("shipment_documents").select("*").eq("shipment_id", shipment.id).order("created_at", { ascending: false });
    setDocs(data || []);
  };

  useEffect(() => { loadDocs(); }, [shipment?.id]);

  const handleUpload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !shipment) return;
    const path = `${shipment.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("shipment-docs").upload(path, file);
    if (error) return toast.error(error.message);
    await supabase.from("shipment_documents").insert({
      shipment_id: shipment.id, doc_type: docType, file_path: path, file_name: file.name, uploaded_by: user.id,
    });
    await supabase.from("audit_log").insert({ action: "upload_doc", entity_type: "shipment", entity_id: shipment.id, user_id: user.id, performed_by: "human", details: { doc_type: docType, file_name: file.name } });
    toast.success("Documento subido");
    loadDocs();
  };

  const handleDelete = async (d: any) => {
    await supabase.storage.from("shipment-docs").remove([d.file_path]);
    await supabase.from("shipment_documents").delete().eq("id", d.id);
    loadDocs();
  };

  const handleDownload = async (d: any) => {
    const { data } = await supabase.storage.from("shipment-docs").createSignedUrl(d.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (!shipment) return null;
  const currentIdx = STAGES.findIndex((s) => s.key === shipment.status);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Ship className="h-4 w-4" /> {shipment.po_number}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div>
            <p className="text-sm font-semibold">{shipment.supplier}</p>
            <p className="text-xs text-muted-foreground">ETA: {shipment.eta || "—"} · ${(shipment.value || 0).toLocaleString()} · {shipment.item_count || 0} ítems</p>
          </div>

          <div>
            <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Timeline</p>
            <div className="space-y-2">
              {STAGES.map((s, i) => (
                <div key={s.key} className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs ${i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i <= currentIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-sm ${i === currentIdx ? "font-semibold" : ""}`}>{s.label}</span>
                  {i === currentIdx && <Badge variant="secondary" className="ml-auto text-[10px]">Actual</Badge>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Vault de documentos</p>
            <div className="flex gap-2 mb-3">
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="text-xs border rounded px-2 bg-background">
                <option>BL</option><option>Factura</option><option>Packing List</option><option>Otro</option>
              </select>
              <Input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} className="text-xs h-8" />
            </div>
            <div className="space-y-2">
              {docs.length === 0 && <p className="text-xs text-muted-foreground">Sin documentos</p>}
              {docs.map((d) => (
                <Card key={d.id} className="p-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary" className="text-[10px]">{d.doc_type}</Badge>
                  <span className="text-xs flex-1 truncate cursor-pointer hover:underline" onClick={() => handleDownload(d)}>{d.file_name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(d)}><Trash2 className="h-3 w-3" /></Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
