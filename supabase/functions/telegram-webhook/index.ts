// Telegram webhook receiver. Set webhook to:
// https://<project>.supabase.co/functions/v1/telegram-webhook?secret=<TELEGRAM_WEBHOOK_SECRET>
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

async function tgSend(chat_id: number, text: string) {
  if (!TG_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: "Markdown" }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const update = await req.json();
    const msg = update.message;
    if (!msg) return new Response("ok");

    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (text.startsWith("/start")) {
      await supabase.from("telegram_subscribers").upsert({ chat_id: chatId, username: msg.from?.username, active: true }, { onConflict: "chat_id" });
      await tgSend(chatId, "✅ *Suscrito a Procurement & Harbor.* Recibirás alertas de stock bajo y embarques. Comandos: /stock /embarques /tendencias");
      return new Response("ok");
    }
    if (text.startsWith("/stop")) {
      await supabase.from("telegram_subscribers").update({ active: false }).eq("chat_id", chatId);
      await tgSend(chatId, "🚫 Suscripción pausada.");
      return new Response("ok");
    }
    if (text.startsWith("/stock")) {
      const { data } = await supabase.from("skus").select("sku_code, name, stock").lt("stock", 15).order("stock").limit(10);
      const body = (data || []).map((s: any) => `• *${s.sku_code}* ${s.name}: ${s.stock}`).join("\n") || "Todo OK";
      await tgSend(chatId, `📦 *Stock bajo:*\n${body}`);
      return new Response("ok");
    }
    if (text.startsWith("/embarques")) {
      const { data } = await supabase.from("shipments").select("po_number, supplier, status, eta").neq("status", "warehouse").limit(10);
      const body = (data || []).map((s: any) => `• ${s.po_number} ${s.supplier} (${s.status}) ETA ${s.eta || "—"}`).join("\n") || "Sin embarques activos";
      await tgSend(chatId, `🚢 *Embarques activos:*\n${body}`);
      return new Response("ok");
    }
    if (text.startsWith("/tendencias")) {
      const { data } = await supabase.from("trends").select("name, score, category").order("score", { ascending: false }).limit(5);
      const body = (data || []).map((t: any) => `• *${t.name}* (${t.category}) — ${t.score}`).join("\n");
      await tgSend(chatId, `📈 *Top tendencias:*\n${body}`);
      return new Response("ok");
    }

    await tgSend(chatId, "Comandos: /stock /embarques /tendencias /stop");
    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("err", { status: 500 });
  }
});
