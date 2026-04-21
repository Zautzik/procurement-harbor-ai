// Broadcast a message to all active Telegram subscribers
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { message } = await req.json();
    const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TG) return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: subs } = await supabase.from("telegram_subscribers").select("chat_id").eq("active", true);

    let sent = 0;
    for (const s of subs || []) {
      const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: s.chat_id, text: message, parse_mode: "Markdown" }),
      });
      if (r.ok) sent++;
    }
    return new Response(JSON.stringify({ sent, total: subs?.length || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "err" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
