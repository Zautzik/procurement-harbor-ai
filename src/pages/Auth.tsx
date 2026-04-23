import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Anchor, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "credentials" | "mfa";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkMfaAndProceed = async () => {
    // Determine if user has any verified TOTP factor → require challenge
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (totp) {
        const { data: ch, error } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (error) throw error;
        setMfaFactorId(totp.id);
        setMfaChallengeId(ch.id);
        setStep("mfa");
        return;
      }
    }
    navigate("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await checkMfaAndProceed();
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "¡Cuenta creada!", description: "Revisa tu email para confirmar tu cuenta." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (code: string) => {
    if (!mfaFactorId || !mfaChallengeId) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId, challengeId: mfaChallengeId, code,
      });
      if (error) throw error;
      navigate("/");
    } catch (err: any) {
      toast({ title: "Código inválido", description: err.message, variant: "destructive" });
      setMfaCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              {step === "mfa" ? <ShieldCheck className="h-7 w-7 text-primary-foreground" /> : <Anchor className="h-7 w-7 text-primary-foreground" />}
            </div>
          </div>
          <CardTitle className="font-heading text-2xl">Procurement & Harbor</CardTitle>
          <CardDescription>
            {step === "mfa" ? "Verificación en dos pasos" : isLogin ? "Inicia sesión en tu cuenta" : "Crea tu cuenta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tu nombre" required={!isLogin} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.cl" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Cargando..." : isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
                  {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
                </button>
              </div>
            </>
          )}

          {step === "mfa" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Ingresa el código de 6 dígitos de tu app autenticadora.</p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={(v) => {
                    setMfaCode(v);
                    if (v.length === 6) verifyMfa(v);
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                    <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button variant="ghost" className="w-full" onClick={async () => {
                await supabase.auth.signOut();
                setStep("credentials"); setMfaCode(""); setMfaFactorId(null); setMfaChallengeId(null);
              }}>Cancelar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
