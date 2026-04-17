import { useEffect, useState } from "react";
import { Bot, CheckCircle2, XCircle, Eye, Zap, Target, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Action = {
  id: string; action_type: string; description: string;
  status: "pending" | "approved" | "rejected"; created_at: string;
  details: any;
};

export default function AIAgent() {
  const [actions, setActions] = useState<Action[]>([]);

  const load = async () => {
    const { data } = await supabase.from("ai_agent_actions").select("*").order("created_at", { ascending: false });
    setActions((data as Action[]) || []);
  };

  useEffect(() => { load(); }, []);

  const handle = async (id: string, status: "approved" | "rejected") => {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("ai_agent_actions").update({
      status, resolved_at: new Date().toISOString(), resolved_by: user?.id,
    }).eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(status === "approved" ? "Acción aprobada" : "Acción rechazada");
      await supabase.from("audit_log").insert({
        action: `ai_action_${status}`, entity_type: "ai_agent_action", entity_id: id,
        user_id: user?.id, performed_by: "human",
      });
      load();
    }
  };

  const pending = actions.filter((a) => a.status === "pending");
  const resolved = actions.filter((a) => a.status !== "pending");

  const metrics = [
    { label: "Decisiones esta semana", value: String(actions.length), icon: Zap },
    { label: "Tasa de aprobación", value: actions.length ? `${Math.round((actions.filter(a => a.status === "approved").length / actions.length) * 100)}%` : "—", icon: Target },
    { label: "Pendientes", value: String(pending.length), icon: Shield },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Agente IA</h1>
        <p className="text-sm text-muted-foreground">Transparencia y control sobre las acciones de ThreadOps</p>
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
            <Bot className="h-4 w-4 text-primary" />
            Aprobaciones Pendientes ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin acciones pendientes</p>}
          {pending.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.action_type}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs"><Eye className="h-3 w-3 mr-1" />Ver</Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => handle(item.id, "approved")}><CheckCircle2 className="h-3 w-3 mr-1" />Aprobar</Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handle(item.id, "rejected")}><XCircle className="h-3 w-3 mr-1" />Rechazar</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resolved.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin historial</p>}
          {resolved.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 text-sm">
              <Bot className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{entry.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
              </div>
              <Badge variant={entry.status === "approved" ? "default" : "destructive"} className="text-[10px]">
                {entry.status === "approved" ? "Aprobada" : "Rechazada"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
