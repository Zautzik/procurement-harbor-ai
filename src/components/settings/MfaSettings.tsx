import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Factor = { id: string; status: string; friendly_name?: string };

export function MfaSettings() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp || []) as Factor[]);
  };

  useEffect(() => { load(); }, []);

  const startEnroll = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: friendlyName || `Authenticator ${new Date().toLocaleDateString()}`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  };

  const verifyEnroll = async (c: string) => {
    if (!factorId) return;
    setLoading(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr) { setLoading(false); return toast.error(chErr.message); }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: c });
    setLoading(false);
    if (error) { setCode(""); return toast.error(error.message); }
    toast.success("MFA activado");
    setEnrolling(false); setQr(null); setSecret(null); setCode(""); setFactorId(null); setFriendlyName("");
    load();
  };

  const removeFactor = async (id: string) => {
    if (!confirm("¿Eliminar este factor MFA?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) return toast.error(error.message);
    toast.success("Factor eliminado");
    load();
  };

  const verified = factors.filter(f => f.status === "verified");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          {verified.length > 0 ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
          Autenticación en dos pasos (MFA)
        </CardTitle>
        <CardDescription>
          {verified.length > 0 ? "Tu cuenta está protegida con TOTP." : "Añade una capa extra de seguridad usando una app autenticadora (Google Authenticator, 1Password, Authy)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verified.length > 0 && (
          <div className="space-y-2">
            {verified.map((f) => (
              <div key={f.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-[10px]">Activo</Badge>
                  <span>{f.friendly_name || "Authenticator"}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFactor(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        )}

        {!enrolling && (
          <div className="space-y-2">
            <Label className="text-xs">Nombre del dispositivo (opcional)</Label>
            <Input value={friendlyName} onChange={(e) => setFriendlyName(e.target.value)} placeholder="iPhone de Juan" />
            <Button onClick={startEnroll} disabled={loading}>Añadir autenticador</Button>
          </div>
        )}

        {enrolling && qr && (
          <div className="space-y-3">
            <div className="rounded-md border p-3 space-y-2 text-center">
              <p className="text-xs text-muted-foreground">Escanea este código QR con tu app autenticadora:</p>
              <img src={qr} alt="QR MFA" className="mx-auto h-48 w-48 bg-white rounded" />
              {secret && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Ingresar manualmente</summary>
                  <code className="block mt-1 font-mono text-xs break-all bg-muted p-2 rounded">{secret}</code>
                </details>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Ingresa el código de 6 dígitos</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={(v) => { setCode(v); if (v.length === 6) verifyEnroll(v); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                    <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setEnrolling(false); setQr(null); setCode(""); setFactorId(null); }}>Cancelar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
