import { Bot, CheckCircle2, XCircle, Eye, Zap, Target, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const pendingApprovals = [
  { id: 1, action: "Generar Orden de Compra", detail: "Lino Azul Navy — 50 rollos a Suzhou Textiles", risk: "bajo", timestamp: "Hoy 08:45" },
  { id: 2, action: "Enviar alerta de stock a cliente", detail: "Telas Premium Chile — Seda Crema agotándose", risk: "bajo", timestamp: "Hoy 09:10" },
  { id: 3, action: "Aplicar descuento sugerido", detail: "Poliéster Reciclado -15% (tendencia a la baja)", risk: "medio", timestamp: "Hoy 09:30" },
];

const agentLog = [
  { id: 1, text: "Detectó stock bajo de Lino Azul Navy → generó borrador OC → esperando aprobación", time: "08:45" },
  { id: 2, text: "Analizó tendencias semanales → actualizó scores de 15 SKUs", time: "08:30" },
  { id: 3, text: "Procesó packing list de PO-2026-001 → verificó 4 ítems coinciden", time: "08:15" },
  { id: 4, text: "Envió resumen semanal de tendencias al chat", time: "Lun 10:00" },
];

const metrics = [
  { label: "Decisiones esta semana", value: "23", icon: Zap },
  { label: "Precisión estimada", value: "94%", icon: Target },
  { label: "Ahorro estimado", value: "$2.1M CLP", icon: Shield },
];

export default function AIAgent() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Agente IA</h1>
        <p className="text-sm text-muted-foreground">Transparencia y control sobre las acciones de ThreadOps</p>
      </div>

      {/* Metrics */}
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

      {/* Pending Approvals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Aprobaciones Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingApprovals.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.action}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">Riesgo {item.risk}</Badge>
                  <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs"><Eye className="h-3 w-3 mr-1" />Ver</Button>
                <Button size="sm" className="h-7 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Aprobar</Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs"><XCircle className="h-3 w-3 mr-1" />Rechazar</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">Registro de Actividad IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {agentLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 text-sm">
              <Bot className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p>{entry.text}</p>
                <p className="text-xs text-muted-foreground">{entry.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
