import { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

type Trend = {
  id: string; name: string; category: string; score: number;
  market: string | null; season: string | null; description: string | null; sparkline_data: any;
};

export default function TrendRadar() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [digest, setDigest] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    supabase.from("trends").select("*").order("score", { ascending: false }).then(({ data }) => setTrends((data as Trend[]) || []));
    supabase.from("weekly_digests").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setDigest(data));
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    const { error } = await supabase.functions.invoke("weekly-digest");
    if (error) toast.error(error.message); else toast.success("Digest generado");
    setGenerating(false);
    load();
  };

  const alignment = trends.length ? Math.round(trends.reduce((s, t) => s + t.score, 0) / trends.length) : 0;
  const atRisk = (digest?.at_risk_skus as any[]) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Trend Radar</h1>
          <p className="text-sm text-muted-foreground">Inteligencia de tendencias textiles</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", generating && "animate-spin")} />Generar digest
          </Button>
          <Card className="px-6 py-3 bg-primary/5 border-primary/20">
            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-primary">{alignment}%</div>
              <div className="text-xs text-muted-foreground">Alineación</div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {digest && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-base font-heading">📰 Digest Semanal · {digest.week_start}</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-line">{digest.summary || "—"}</p></CardContent>
          </Card>
        )}

        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Panel de Riesgos ({atRisk.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
            {atRisk.length === 0 && <p className="text-xs text-muted-foreground">Sin riesgos (genera el digest)</p>}
            {atRisk.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant="destructive" className="text-[10px]">{r.risk}</Badge>
                <span className="text-xs flex-1">{r.name || r.po_number} {r.stock != null && `(stock: ${r.stock})`}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {trends.map((trend) => {
          const sparkline = Array.isArray(trend.sparkline_data) ? trend.sparkline_data : [];
          return (
            <Card key={trend.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-heading font-semibold text-sm">{trend.name}</p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{trend.category}</Badge>
                      {trend.market && <Badge variant="secondary" className="text-[10px]">{trend.market}</Badge>}
                    </div>
                  </div>
                  <div className={cn("text-2xl font-heading font-bold", trend.score >= 80 ? "text-primary" : trend.score >= 60 ? "text-chart-3" : "text-destructive")}>{trend.score}</div>
                </div>
                {sparkline.length > 0 && (
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkline.map((v: number, i: number) => ({ v, i }))}>
                        <Line type="monotone" dataKey="v" stroke="hsl(155 100% 41%)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs"><TrendingUp className="h-3 w-3 text-primary" /><span className="text-primary">Tendencia activa</span></div>
                {trend.description && <p className="text-xs text-muted-foreground leading-relaxed">{trend.description}</p>}
                {trend.season && <p className="text-[10px] text-muted-foreground">{trend.season}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
