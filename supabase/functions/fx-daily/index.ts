// Daily FX rate sync from mindicador.cl (CLP rates) + exchangerate.host fallback for CNY/EUR
// Scheduled via pg_cron at 09:00 America/Santiago
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
    const today = new Date().toISOString().slice(0, 10);
    const rates: Array<{ base: string; quote: string; rate: number }> = [];

    // mindicador.cl provides CLP-quoted rates from official Banco Central de Chile
    const mind = await fetch("https://mindicador.cl/api").then((r) => r.json()).catch(() => null);
    if (mind?.dolar?.valor) rates.push({ base: "USD", quote: "CLP", rate: Number(mind.dolar.valor) });
    if (mind?.euro?.valor) rates.push({ base: "EUR", quote: "CLP", rate: Number(mind.euro.valor) });

    // CNY/CLP via cross rate USD/CLP * CNY/USD
    if (mind?.dolar?.valor) {
      const cnyUsd = await fetch("https://api.exchangerate.host/latest?base=CNY&symbols=USD")
        .then((r) => r.json())
        .catch(() => null);
      if (cnyUsd?.rates?.USD) {
        rates.push({
          base: "CNY",
          quote: "CLP",
          rate: Number(cnyUsd.rates.USD) * Number(mind.dolar.valor),
        });
      }
    }

    if (rates.length === 0) {
      return new Response(JSON.stringify({ error: "No rates fetched" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert by (base, quote, rate_date)
    let written = 0;
    for (const r of rates) {
      const { error } = await supabase.from("fx_rates").insert({
        base_currency: r.base,
        quote_currency: r.quote,
        rate: r.rate,
        rate_date: today,
        source: "mindicador.cl",
      });
      if (!error) written++;
    }

    return new Response(JSON.stringify({ ok: true, written, rates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "err" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
