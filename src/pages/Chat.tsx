import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Camera, Bot, User, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { parseChatContent, SkuCard, ShipmentCard } from "@/components/chat/ChatCards";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; timestamp: string; image_url?: string };

const ts = () => new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "¡Hola! 👋 Soy **ThreadOps**.\n\n📦 Inventario · 🚢 Embarques · 📈 Tendencias · 🧾 OC (con tu aprobación) · 📷 Sube una foto de tela y la analizo.",
      timestamp: ts(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [pendingImg, setPendingImg] = useState<{ url: string; path: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load history
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("chat_messages").select("*").eq("user_id", user.id).order("created_at").limit(50);
      if (data && data.length) {
        setMessages([
          ...data.map((m: any) => ({ role: m.role as any, content: m.content, timestamp: new Date(m.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) })),
        ]);
      }
    })();
  }, []);

  const handleFile = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Inicia sesión");
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("chat-uploads").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage.from("chat-uploads").createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setPendingImg({ url: data.signedUrl, path });
      toast.success("Imagen lista. Escribe tu pregunta y envía.");
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingImg) || loading) return;
    const userMsg: Msg = { role: "user", content: input || "Analiza esta imagen", timestamp: ts(), image_url: pendingImg?.url };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    const img = pendingImg;
    setPendingImg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          image_url: img?.url,
        },
      });
      if (error) throw error;
      const content = data?.content || data?.error || "Sin respuesta.";
      setMessages((prev) => [...prev, { role: "assistant", content, timestamp: ts() }]);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("chat_messages").insert([
          { user_id: user.id, role: "user", content: userMsg.content, metadata: img ? { image_url: img.url } : {} },
          { user_id: user.id, role: "assistant", content },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${e.message || "Error"}`, timestamp: ts() }]);
    } finally {
      setLoading(false);
    }
  };

  const visible = search ? messages.filter((m) => m.content.toLowerCase().includes(search.toLowerCase())) : messages;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="border-b px-4 py-3 flex items-center gap-3 bg-card">
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="font-heading text-sm font-semibold">ThreadOps AI</h2>
          <p className="text-xs text-muted-foreground">{loading ? "Pensando..." : "En línea · Con acceso a tus datos"}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowSearch((v) => !v)}><Search className="h-4 w-4" /></Button>
      </div>

      {showSearch && (
        <div className="border-b p-2 bg-card">
          <Input placeholder="Buscar en historial..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8" />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
        {visible.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("flex gap-2 max-w-[75%]", msg.role === "user" && "flex-row-reverse")}>
              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1", msg.role === "user" ? "bg-foreground/10" : "bg-primary")}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary-foreground" />}
              </div>
              <div>
                <div className={cn("rounded-2xl px-4 py-2.5 text-sm leading-relaxed", msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border rounded-tl-sm shadow-sm")}>
                  {msg.image_url && <img src={msg.image_url} alt="upload" className="rounded-lg mb-2 max-w-full max-h-48" />}
                  {parseChatContent(msg.content).map((p, idx) => {
                    if (p.kind === "text") return <div key={idx} className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{p.content}</ReactMarkdown></div>;
                    if (p.kind === "sku") return <SkuCard key={idx} d={p.data} />;
                    if (p.kind === "shipment") return <ShipmentCard key={idx} d={p.data} />;
                    return null;
                  })}
                </div>
                {msg.timestamp && <p className={cn("text-[10px] text-muted-foreground mt-1", msg.role === "user" && "text-right")}>{msg.timestamp}</p>}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center mt-1"><Bot className="h-4 w-4 text-primary-foreground" /></div>
              <div className="bg-card border rounded-2xl shadow-sm px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            </div>
          </div>
        )}
      </div>

      {pendingImg && (
        <div className="border-t px-3 py-2 bg-card flex items-center gap-2">
          <img src={pendingImg.url} alt="preview" className="h-12 w-12 object-cover rounded" />
          <span className="text-xs text-muted-foreground flex-1">Imagen lista para enviar</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPendingImg(null)}><X className="h-3 w-3" /></Button>
        </div>
      )}

      <div className="border-t p-3 bg-card">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4" /></Button>
          </div>
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={pendingImg ? "Pregunta sobre la foto..." : "Escribe un mensaje..."} className="flex-1 rounded-full bg-muted border-0" disabled={loading} />
          <Button onClick={handleSend} size="icon" className="h-9 w-9 rounded-full" disabled={(!input.trim() && !pendingImg) || loading}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
