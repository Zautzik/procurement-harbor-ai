import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trends } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function TrendRadar() {
  const alignment = Math.round(trends.reduce((s, t) => s + (t.matchedSkus.length > 0 ? t.score : 0), 0) / trends.length);

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
        {trends.map((trend) => (
          <Card key={trend.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-semibold text-sm">{trend.name}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{trend.category}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{trend.market}</Badge>
                  </div>
                </div>
                <div className={cn("text-2xl font-heading font-bold", trend.score >= 80 ? "text-primary" : trend.score >= 60 ? "text-chart-3" : "text-destructive")}>
                  {trend.score}
                </div>
              </div>

              {/* Sparkline */}
              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.sparkline.map((v, i) => ({ v, i }))}>
                    <Line type="monotone" dataKey="v" stroke={trend.change >= 0 ? "hsl(155 100% 41%)" : "hsl(0 84% 60%)"} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs">
                  {trend.change >= 0 ? <TrendingUp className="h-3 w-3 text-primary" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                  <span className={cn(trend.change >= 0 ? "text-primary" : "text-destructive")}>
                    {trend.change > 0 && "+"}{trend.change} pts
                  </span>
                </div>
                {trend.matchedSkus.length > 0 && (
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {trend.matchedSkus.length} SKU match
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{trend.description}</p>
              <p className="text-[10px] text-muted-foreground">{trend.season}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
