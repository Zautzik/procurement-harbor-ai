import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres ThreadOps AI, asistente de Procurement & Harbor (importadores textiles China→Chile/LatAm).

Personalidad: Profesional, conciso, español preferido. Conoces telas (lino, algodón, poliéster, seda), logística internacional.

Tienes herramientas (tools) para consultar la base de datos en tiempo real. ÚSALAS siempre que el usuario pregunte por datos:
- query_inventory: stock, SKUs, precios
- query_shipments: estado de embarques
- query_trends: tendencias del mercado
- create_purchase_order_draft: crea un borrador en ai_agent_actions que el manager debe aprobar (NO ejecuta directamente)

Reglas críticas:
- NUNCA inventes datos. Si no tienes info, usa una tool.
- Para crear cualquier acción (OC, ajuste de stock), usa create_purchase_order_draft → requiere aprobación humana.
- Formato: **negrita** para datos clave, listas para estructura, emojis con moderación.`;

const tools = [
  {
    type: "function",
    function: {
      name: "query_inventory",
      description: "Consulta SKUs en inventario. Filtra por nombre, color, tela o devuelve stock bajo.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Texto a buscar en nombre/código/color/tela" },
          low_stock_only: { type: "boolean", description: "Solo SKUs con stock < 15" },
          limit: { type: "number", description: "Máximo de resultados (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_shipments",
      description: "Consulta embarques activos por estado.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ordered", "production", "shipped", "customs", "warehouse"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_trends",
      description: "Devuelve las tendencias actuales del mercado textil ordenadas por score.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "create_purchase_order_draft",
      description: "Crea un BORRADOR de orden de compra que el manager debe aprobar manualmente. NO ejecuta nada.",
      parameters: {
        type: "object",
        properties: {
          supplier: { type: "string" },
          items_description: { type: "string" },
          estimated_value_usd: { type: "number" },
          reason: { type: "string", description: "Por qué sugerir esta OC" },
        },
        required: ["supplier", "items_description", "reason"],
      },
    },
  },
];

async function executeTool(name: string, args: any, supabase: any) {
  if (name === "query_inventory") {
    let q = supabase.from("skus").select("sku_code, name, fabric, color, stock, location, price_clp");
    if (args.low_stock_only) q = q.lt("stock", 15);
    if (args.search) q = q.or(`name.ilike.%${args.search}%,sku_code.ilike.%${args.search}%,color.ilike.%${args.search}%,fabric.ilike.%${args.search}%`);
    q = q.limit(args.limit || 10);
    const { data, error } = await q;
    return error ? { error: error.message } : { skus: data };
  }
  if (name === "query_shipments") {
    let q = supabase.from("shipments").select("po_number, supplier, status, value, eta, item_count");
    if (args.status) q = q.eq("status", args.status);
    const { data, error } = await q.limit(20);
    return error ? { error: error.message } : { shipments: data };
  }
  if (name === "query_trends") {
    const { data, error } = await supabase.from("trends").select("name, category, score, fabric_type, color_family, market").order("score", { ascending: false }).limit(args.limit || 10);
    return error ? { error: error.message } : { trends: data };
  }
  if (name === "create_purchase_order_draft") {
    const { data, error } = await supabase.from("ai_agent_actions").insert({
      action_type: "purchase_order_draft",
      description: `OC sugerida: ${args.supplier} — ${args.items_description}`,
      details: args,
      status: "pending",
    }).select().single();
    return error ? { error: error.message } : { created: true, action_id: data.id, message: "Borrador creado. El manager debe aprobarlo en /ai-agent." };
  }
  return { error: "Tool desconocida" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let conversationMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Tool loop (max 3 iterations to prevent runaways)
    for (let iter = 0; iter < 3; iter++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools,
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Límite excedido. Intenta en un momento." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos agotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI error:", t);
        return new Response(JSON.stringify({ error: "Error de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await response.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // Final answer — stream it back
        return new Response(
          JSON.stringify({ content: msg.content || "" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      conversationMessages.push(msg);
      for (const call of toolCalls) {
        const args = JSON.parse(call.function.arguments || "{}");
        const result = await executeTool(call.function.name, args, supabase);
        conversationMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(JSON.stringify({ content: "Demasiadas iteraciones de herramientas." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
