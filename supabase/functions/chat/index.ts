import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres ThreadOps AI, asistente de Procurement & Harbor (importadores textiles China→Chile/LatAm).

Profesional, conciso, español. Conoces telas (lino, algodón, poliéster, seda) y logística.

TIENES TOOLS — úsalas siempre que se pregunte por datos reales:
- query_inventory: stock, SKUs, precios
- query_shipments: estado embarques
- query_trends: tendencias
- create_purchase_order_draft: crea borrador en ai_agent_actions (REQUIERE aprobación humana)

Si el usuario sube una foto de tela: identifica fibra, color, textura y SUGIERE SKUs similares (usa query_inventory con search).

Cuando devuelvas datos, incluye markers JSON al final para tarjetas inline:
- SKUs: \`\`\`card:sku\\n{"sku_code":"...","name":"...","stock":N,"price_clp":N,"location":"..."}\\n\`\`\`
- Embarque: \`\`\`card:shipment\\n{"po_number":"...","supplier":"...","status":"...","eta":"..."}\\n\`\`\`

NUNCA inventes. Para crear OC usa create_purchase_order_draft.`;

const tools = [
  {
    type: "function",
    function: {
      name: "query_inventory",
      description: "Consulta SKUs en inventario.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string" },
          low_stock_only: { type: "boolean" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_shipments",
      description: "Consulta embarques por estado.",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["ordered", "production", "shipped", "customs", "warehouse"] } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_trends",
      description: "Tendencias del mercado textil.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "create_purchase_order_draft",
      description: "Borrador de OC para aprobación humana.",
      parameters: {
        type: "object",
        properties: {
          supplier: { type: "string" },
          items_description: { type: "string" },
          estimated_value_usd: { type: "number" },
          reason: { type: "string" },
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
    return error ? { error: error.message } : { created: true, action_id: data.id, message: "Borrador creado. Apruébalo en /ai-agent." };
  }
  return { error: "Tool desconocida" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, image_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If an image is included, prepend it to the last user message as multimodal content
    const conv = [...messages];
    if (image_url && conv.length > 0) {
      const last = conv[conv.length - 1];
      if (last.role === "user") {
        last.content = [
          { type: "text", text: typeof last.content === "string" ? last.content : "Analiza esta foto de tela." },
          { type: "image_url", image_url: { url: image_url } },
        ];
      }
    }

    let conversationMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conv,
    ];

    for (let iter = 0; iter < 4; iter++) {
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
        return new Response(JSON.stringify({ content: msg.content || "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      conversationMessages.push(msg);
      for (const call of toolCalls) {
        const args = JSON.parse(call.function.arguments || "{}");
        const result = await executeTool(call.function.name, args, supabase);
        conversationMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    return new Response(JSON.stringify({ content: "Demasiadas iteraciones." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
