import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ship, Package, MessageSquare, Calculator, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ph_onboarding_completed_v1";

const STEPS = [
  {
    icon: Ship,
    title: "Bienvenido a Procurement & Harbor",
    body: "Tu centro de comando para operar la cadena China → Latam de extremo a extremo.",
  },
  {
    icon: Package,
    title: "Inventario y Bodegas",
    body: "Registra SKUs, mueve stock entre bodegas y reserva unidades al confirmar pedidos.",
  },
  {
    icon: Ship,
    title: "Embarques con Kanban",
    body: "Arrastra embarques entre estados. Al llegar a 'Bodega' el stock se carga automáticamente.",
  },
  {
    icon: Calculator,
    title: "Motor de Costeo",
    body: "Calcula landed cost real (FOB + flete + aduana) y proyecta margen por escenario.",
  },
  {
    icon: MessageSquare,
    title: "Asistente IA con aprobación",
    body: "Pídele cualquier acción. Las acciones críticas requieren tu aprobación explícita antes de ejecutarse.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  };

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 to-transparent p-6 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <cur.icon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-4 font-heading text-xl font-bold tracking-tight">{cur.title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{cur.body}</p>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 bg-card/40 px-6 py-3">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
              Saltar
            </Button>
            {isLast ? (
              <Button size="sm" onClick={finish} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Empezar
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Siguiente
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
