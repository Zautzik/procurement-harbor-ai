import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: trends } = await supabase
      .from("trends").select("name, score, category, market")
      .order("score", { ascending: false }).limit(5);

    const { data: lowStock } = await supabase
      .from("skus").select("sku_code, name, stock, location")
      .lt("stock", 15).order("stock").limit(15);

    const { data: stale } = await supabase
      .from("shipments").select("po_number, supplier, status, eta")
      .in("status", ["customs", "shipped"]).limit(10);

    const atRisk = [
      ...(lowStock || []).map((s: any) => ({ ...s, risk: "stock_bajo" })),
      ...(stale || []).map((s: any) => ({ ...s, risk: "embarque_atrasado" })),
    ];

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // Generate AI summary
    let summary = "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Eres analista textil. Resume en 3 bullets concisos (español, máx 60 palabras total)." },
            { role: "user", content: `Top tendencias: ${JSON.stringify(trends)}. SKUs en riesgo: ${JSON.stringify(atRisk.slice(0, 5))}` },
          ],
        }),
      });
      const d = await r.json();
      summary = d.choices?.[0]?.message?.content || "";
    }

    await supabase.from("weekly_digests").insert({
      week_start: weekStartStr,
      top_trends: trends || [],
      at_risk_skus: atRisk,
      summary,
    });

    // Create alerts for low stock
    for (const item of (lowStock || []).slice(0, 5)) {
      await supabase.from("alerts").insert({
        type: "low_stock",
        severity: "warning",
        title: `Stock bajo: ${item.name}`,
        message: `Quedan ${item.stock} unidades de ${item.sku_code}`,
        entity_type: "sku",
      });
    }

    return new Response(JSON.stringify({ ok: true, atRiskCount: atRisk.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "err" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
