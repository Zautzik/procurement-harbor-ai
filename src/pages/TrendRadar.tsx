import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";

type Trend = {
  id: string; name: string; category: string; score: number;
  market: string | null; season: string | null; description: string | null;
  sparkline_data: any;
};

export default function TrendRadar() {
  const [trends, setTrends] = useState<Trend[]>([]);

  useEffect(() => {
    supabase.from("trends").select("*").order("score", { ascending: false }).then(({ data }) => {
      setTrends((data as Trend[]) || []);
    });
  }, []);

  const alignment = trends.length ? Math.round(trends.reduce((s, t) => s + t.score, 0) / trends.length) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Trend Radar</h1>
          <p className="text-sm text-muted-foreground">Inteligencia de tendencias textiles</p>
        </div>
        <Card className="px-6 py-3 bg-primary/5 border-primary/20">
          <div className="text-center">
            <div className="text-3xl font-heading font-bold text-primary">{alignment}%</div>
            <div className="text-xs text-muted-foreground">Alineación Inventario</div>
          </div>
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
                  <div className={cn("text-2xl font-heading font-bold", trend.score >= 80 ? "text-primary" : trend.score >= 60 ? "text-chart-3" : "text-destructive")}>
                    {trend.score}
                  </div>
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

                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="text-primary">Tendencia activa</span>
                </div>

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
