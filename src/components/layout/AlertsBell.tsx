import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function AlertsBell() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<any[]>([]);

  const load = () => {
    supabase.from("alerts").select("*").eq("acknowledged", false)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setAlerts(data || []));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("alerts-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const ack = async (id: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from("alerts").update({
      acknowledged: true, acknowledged_by: user?.id, acknowledged_at: new Date().toISOString(),
    }).eq("id", id);
    toast.success(t("acknowledge"));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {alerts.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center" variant="destructive">
              {alerts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">{t("alerts")}</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground text-center">{t("noAlerts")}</p>
          )}
          {alerts.map((a) => (
            <div key={a.id} className="p-3 border-b last:border-0 hover:bg-muted/40">
              <div className="flex items-start gap-2">
                <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="text-[9px] mt-0.5">
                  {a.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{a.title}</p>
                  {a.message && <p className="text-[11px] text-muted-foreground line-clamp-2">{a.message}</p>}
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => ack(a.id)}>
                  OK
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
