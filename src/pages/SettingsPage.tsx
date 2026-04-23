import { useEffect, useState } from "react";
import { Building2, Users, Bot, Bell, Database, Globe, Send, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MfaSettings } from "@/components/settings/MfaSettings";

export default function SettingsPage() {
  const { i18n, t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [roles, setRoles] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [tgMsg, setTgMsg] = useState("");
  const [subs, setSubs] = useState<any[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    setDisplayName(p?.display_name || "");
    const { data: r } = await supabase.from("user_roles").select("*").eq("user_id", user.id);
    setRoles(r || []);
    const admin = (r || []).some((x: any) => x.role === "admin");
    setIsAdmin(admin);
    if (admin) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name");
      const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");
      setAllUsers((profs || []).map((p: any) => ({ ...p, roles: (allRoles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role) })));
      const { data: s } = await supabase.from("telegram_subscribers").select("*").order("created_at", { ascending: false });
      setSubs(s || []);
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const lang = i18n.language.startsWith("zh") ? "zh" : i18n.language.startsWith("en") ? "en" : "es";
    const { error } = await supabase.from("profiles").update({ display_name: displayName, language: lang }).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil guardado");
  };

  const setUserRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success(`Rol ${role} asignado`); load();
  };

  const removeRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    toast.success("Rol removido"); load();
  };

  const broadcastTelegram = async () => {
    if (!tgMsg.trim()) return;
    const { data, error } = await supabase.functions.invoke("telegram-broadcast", { body: { message: tgMsg } });
    if (error) return toast.error(error.message);
    toast.success(`Enviado a ${data?.sent || 0} suscriptores`);
    setTgMsg("");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("settings")}</h1>
        <p className="text-sm text-muted-foreground">Administra tu cuenta y preferencias</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-heading flex items-center gap-2"><Globe className="h-4 w-4" /> {t("language")}</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <p className="text-sm flex-1">Español · English · 中文</p>
          <Button size="sm" variant={i18n.language.startsWith("es") ? "default" : "outline"} onClick={() => i18n.changeLanguage("es")}>ES</Button>
          <Button size="sm" variant={i18n.language.startsWith("en") ? "default" : "outline"} onClick={() => i18n.changeLanguage("en")}>EN</Button>
          <Button size="sm" variant={i18n.language.startsWith("zh") ? "default" : "outline"} onClick={() => i18n.changeLanguage("zh")}>中文</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-heading flex items-center gap-2"><Building2 className="h-4 w-4" /> Mi Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nombre</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
          <div className="flex gap-2 items-center">
            <Label className="m-0">Roles:</Label>
            {roles.map((r) => <Badge key={r.id} variant="secondary">{r.role}</Badge>)}
          </div>
          <Button size="sm" onClick={saveProfile}>Guardar</Button>
        </CardContent>
      </Card>

      <MfaSettings />
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-heading flex items-center gap-2"><Users className="h-4 w-4" /> Gestión de Usuarios</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {allUsers.map((u) => (
                <div key={u.user_id} className="flex items-center gap-3 p-2 border rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.display_name || u.user_id.slice(0, 8)}</p>
                    <div className="flex gap-1 mt-1">
                      {u.roles.map((r: string) => (
                        <Badge key={r} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => removeRole(u.user_id, r)} title="Click para remover">{r} ✕</Badge>
                      ))}
                    </div>
                  </div>
                  <select onChange={(e) => { if (e.target.value) { setUserRole(u.user_id, e.target.value); e.target.value = ""; } }} className="text-xs border rounded px-2 py-1 bg-background">
                    <option value="">+ Agregar rol</option>
                    <option value="admin">admin</option><option value="manager">manager</option>
                    <option value="warehouse">warehouse</option><option value="viewer">viewer</option>
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-heading flex items-center gap-2"><Send className="h-4 w-4" /> Telegram Broadcast ({subs.filter(s => s.active).length} suscriptores)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Para suscribirse: envía <code>/start</code> al bot. Configura el webhook en <code>https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=https://qntcsxsoczbgrozfoitc.supabase.co/functions/v1/telegram-webhook</code></p>
              <Input value={tgMsg} onChange={(e) => setTgMsg(e.target.value)} placeholder="Mensaje (Markdown)..." />
              <Button size="sm" onClick={broadcastTelegram} disabled={!tgMsg.trim()}>Enviar</Button>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-heading flex items-center gap-2"><Bot className="h-4 w-4" /> IA & Agente</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">El agente IA requiere aprobación humana para todas las acciones (OC, ajustes). Revisa pendientes en Agente IA.</CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-heading flex items-center gap-2"><Bell className="h-4 w-4" /> Alertas</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Stock bajo (&lt;15) genera alertas en el digest semanal y notifica por Telegram.</CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-heading flex items-center gap-2"><Database className="h-4 w-4" /> Datos & Seguridad</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Exporta CSV desde cada módulo · Importa Excel desde Inventario · Auditoría completa en audit_log · RLS activo.</CardContent>
      </Card>
    </div>
  );
}
