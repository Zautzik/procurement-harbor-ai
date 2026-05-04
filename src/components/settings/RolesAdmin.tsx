import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, UserCog } from "lucide-react";

type AppRole = "admin" | "manager" | "warehouse" | "viewer";
const ROLES: AppRole[] = ["admin", "manager", "warehouse", "viewer"];

type Row = { user_id: string; display_name: string | null; roles: AppRole[] };

export function RolesAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: myRoles } = await supabase.from("user_roles").select("role").eq("user_id", user?.id || "");
    const admin = (myRoles || []).some((r: any) => r.role === "admin");
    setIsAdmin(admin);
    if (!admin) { setLoading(false); return; }

    const { data: profiles } = await supabase.from("profiles").select("user_id,display_name");
    const { data: allRoles } = await supabase.from("user_roles").select("user_id,role");
    const map: Record<string, AppRole[]> = {};
    (allRoles || []).forEach((r: any) => {
      map[r.user_id] = [...(map[r.user_id] || []), r.role];
    });
    setRows((profiles || []).map((p: any) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      roles: map[p.user_id] || [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success(`Rol "${role}" asignado`);
    load();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success(`Rol "${role}" removido`);
    load();
  };

  if (!isAdmin && !loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <ShieldCheck className="mx-auto h-8 w-8 mb-2 opacity-40" />
          Solo administradores pueden gestionar roles.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <UserCog className="h-4 w-4 text-primary" /> Gestión de Roles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Roles asignados</TableHead>
              <TableHead className="w-[200px]">Asignar nuevo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.user_id}>
                <TableCell className="font-medium">
                  {r.display_name || <span className="text-muted-foreground">{r.user_id.slice(0, 8)}…</span>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {r.roles.length === 0 && <span className="text-xs text-muted-foreground">— sin roles —</span>}
                    {r.roles.map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                        onClick={() => removeRole(r.user_id, role)}
                        title="Click para remover"
                      >
                        {role} ✕
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Select onValueChange={(v: AppRole) => addRole(r.user_id, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="+ rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.filter((role) => !r.roles.includes(role)).map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
