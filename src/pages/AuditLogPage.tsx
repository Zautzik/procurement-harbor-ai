import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { History, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  performed_by: string;
  user_id: string | null;
  details: any;
  created_at: string;
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterActor, setFilterActor] = useState<string>("all");

  useEffect(() => {
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setLogs((data as LogRow[]) || []));
  }, []);

  const types = Array.from(new Set(logs.map((l) => l.entity_type)));
  const filtered = logs.filter((l) => {
    if (filterType !== "all" && l.entity_type !== filterType) return false;
    if (filterActor !== "all" && l.performed_by !== filterActor) return false;
    if (search) {
      const blob = `${l.action} ${l.entity_type} ${JSON.stringify(l.details)}`.toLowerCase();
      if (!blob.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Auditoría
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} de {logs.length} eventos · todas las acciones quedan trazadas</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading uppercase tracking-wider text-muted-foreground">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Buscar acción, entidad, detalle…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger><SelectValue placeholder="Tipo de entidad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las entidades</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterActor} onValueChange={setFilterActor}>
            <SelectTrigger><SelectValue placeholder="Actor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los actores</SelectItem>
              <SelectItem value="human">👤 Humano</SelectItem>
              <SelectItem value="ai">🤖 IA</SelectItem>
              <SelectItem value="system">⚙ Sistema</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.map((log) => {
          const Icon = log.performed_by === "ai" ? Bot : log.performed_by === "system" ? History : UserIcon;
          return (
            <Card key={log.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="flex items-start gap-3 p-3">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  log.performed_by === "ai" ? "bg-accent/30 text-accent-foreground" :
                  log.performed_by === "system" ? "bg-muted text-muted-foreground" :
                  "bg-primary/15 text-primary"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold">{log.action}</span>
                    <Badge variant="outline" className="text-[10px]">{log.entity_type}</Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{log.performed_by}</Badge>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {new Date(log.created_at).toLocaleString("es-CL")}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <pre className="mt-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1 overflow-x-auto font-mono">
                      {JSON.stringify(log.details, null, 0)}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Sin eventos que mostrar.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
