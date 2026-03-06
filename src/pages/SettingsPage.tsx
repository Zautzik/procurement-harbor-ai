import { Building2, Users, Plug, Bot, Bell, Database, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const sections = [
  { icon: Building2, label: "Empresa", desc: "Nombre, RUT, logo, moneda, idioma" },
  { icon: Users, label: "Usuarios", desc: "Gestión de usuarios y roles" },
  { icon: Plug, label: "Integraciones", desc: "WhatsApp Business, Telegram, MercadoLibre" },
  { icon: Bot, label: "IA & Agente", desc: "Configurar autonomía del agente IA" },
  { icon: Bell, label: "Alertas", desc: "Umbrales de stock bajo, retrasos, tendencias" },
  { icon: Database, label: "Datos", desc: "Importar/exportar, backups, reset" },
  { icon: CreditCard, label: "Facturación", desc: "Plan, método de pago, uso" },
];

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Administra tu cuenta y preferencias</p>
      </div>

      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
            {i < sections.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </div>
  );
}
