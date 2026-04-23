import { useEffect, useState } from "react";
import { Bot, CheckCircle2, XCircle, Eye, Zap, Target, Shield, Clock, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ActionStatus = "pending" | "approved" | "rejected";
type Action = {
  id: string;
  action_type: string;
  description: string;
  status: ActionStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  details: any;
};

const ACTION_LABELS: Record<string, string> = {
  reorder: "Reorden",
  price_adjust: "Ajuste de precio",
  stock_adjust: "Ajuste de stock",
  send_alert: "Enviar alerta",
  create_po: "Crear OC",
};

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

export default function AIAgent() {
  const [actions, setActions] = useState<Action[]>([]);
  const [detailFor, setDetailFor] = useState<Action | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("ai_agent_actions")
      .select("*")
      .order("created_at", { ascending: false });
    setActions((data as Action[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("ai-actions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_agent_actions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handle = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("ai_agent_actions").update({
      status, resolved_at: new Date().toISOString(), resolved_by: user?.id,
    }).eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Acción aprobada" : "Acción rechazada");
    await supabase.from("audit_log").insert({
      action: `ai_action_${status}`, entity_type: "ai_agent_action", entity_id: id,
      user_id: user?.id, performed_by: "human",
    });
  };

  const pending = actions.filter((a) => a.status === "pending");
  const approved = actions.filter((a) => a.status === "approved");
  const rejected = actions.filter((a) => a.status === "rejected");

  const last7Days = actions.filter((a) => Date.now() - new Date(a.created_at).getTime() < 7 * 24 * 3600 * 1000);
  const approvalRate = (approved.length + rejected.length) > 0
    ? Math.round((approved.length / (approved.length + rejected.length)) * 100)
    : 0;

  const metrics = [
    { label: "Acciones (7 días)", value: String(last7Days.length), icon: Zap },
    { label: "Tasa de aprobación", value: actions.length ? `${approvalRate}%` : "—", icon: Target },
    { label: "Pendientes ahora", value: String(pending.length), icon: Shield },
  ];

  const renderRow = (item: Action, withActions: boolean) => (
    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{ACTION_LABELS[item.action_type] || item.action_type}</span>
          {item.details?.severity && (
            <Badge variant={item.details.severity === "critical" ? "destructive" : "secondary"} className="text-[9px] uppercase">
              {item.details.severity}
            </Badge>
          )}
          {item.details?.auto_execute && (
            <Badge variant="outline" className="text-[9px]">Auto-exec si aprueba</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <Clock className="h-2.5 w-2.5" />
          <span>{relativeTime(item.created_at)} · {new Date(item.created_at).toLocaleString()}</span>
          {item.resolved_at && <span>· resuelto {relativeTime(item.resolved_at)}</span>}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailFor(item)}>
          <Eye className="h-3 w-3 mr-1" />Ver
        </Button>
        {withActions && (
          <>
            <Button size="sm" className="h-7 text-xs" disabled={busyId === item.id} onClick={() => handle(item.id, "approved")}>
              <CheckCircle2 className="h-3 w-3 mr-1" />Aprobar
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={busyId === item.id} onClick={() => handle(item.id, "rejected")}>
              <XCircle className="h-3 w-3 mr-1" />Rechazar
            </Button>
          </>
        )}
        {!withActions && (
          <Badge variant={item.status === "approved" ? "default" : "destructive"} className="text-[10px] self-center">
            {item.status === "approved" ? "Aprobada" : "Rechazada"}
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Agente IA</h1>
        <p className="text-sm text-muted-foreground">Transparencia y control sobre las acciones automatizadas. Toda acción requiere aprobación humana.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-heading font-bold">{m.value}</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Cola de Acciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pendientes ({pending.length})</TabsTrigger>
              <TabsTrigger value="approved">Aprobadas ({approved.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rechazadas ({rejected.length})</TabsTrigger>
              <TabsTrigger value="all">Todas ({actions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-2">
              {pending.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">Sin acciones pendientes. El agente está al día.</p>
                : pending.map((i) => renderRow(i, true))}
            </TabsContent>
            <TabsContent value="approved" className="mt-4 space-y-2">
              {approved.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">Sin aprobaciones aún.</p>
                : approved.map((i) => renderRow(i, false))}
            </TabsContent>
            <TabsContent value="rejected" className="mt-4 space-y-2">
              {rejected.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">Sin rechazos.</p>
                : rejected.map((i) => renderRow(i, false))}
            </TabsContent>
            <TabsContent value="all" className="mt-4 space-y-2">
              {actions.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">El agente aún no ha propuesto acciones.</p>
                : actions.map((i) => renderRow(i, i.status === "pending"))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!detailFor} onOpenChange={(o) => !o && setDetailFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              {detailFor && (ACTION_LABELS[detailFor.action_type] || detailFor.action_type)}
            </DialogTitle>
          </DialogHeader>
          {detailFor && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Descripción</div>
                <p>{detailFor.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Estado</div>
                  <Badge variant={detailFor.status === "approved" ? "default" : detailFor.status === "rejected" ? "destructive" : "secondary"}>
                    {detailFor.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">Creada</div>
                  <div>{new Date(detailFor.created_at).toLocaleString()}</div>
                </div>
                {detailFor.resolved_at && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Resuelta</div>
                    <div>{new Date(detailFor.resolved_at).toLocaleString()}</div>
                  </div>
                )}
              </div>
              {detailFor.details && Object.keys(detailFor.details || {}).length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Payload</div>
                  <ScrollArea className="max-h-60 rounded-md border bg-muted/30">
                    <pre className="text-[11px] p-3 font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(detailFor.details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailFor?.status === "pending" && (
              <>
                <Button variant="destructive" onClick={() => { handle(detailFor.id, "rejected"); setDetailFor(null); }}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />Rechazar
                </Button>
                <Button onClick={() => { handle(detailFor.id, "approved"); setDetailFor(null); }}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Aprobar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setDetailFor(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
