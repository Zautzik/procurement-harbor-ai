import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Camera, Mic, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string; timestamp: string };

function getTimestamp() {
  return new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "¡Buenos días! 👋 Soy **ThreadOps**, tu asistente de Procurement & Harbor.\n\nPuedo consultar datos reales en vivo:\n- 📦 **Inventario** — *\"cuánto lino azul me queda\"*\n- 🚢 **Embarques** — *\"qué hay en aduana\"*\n- 📈 **Tendencias** — *\"top 3 tendencias\"*\n- 🧾 **OC** — *\"sugiere una OC para reponer stock bajo\"* (requiere tu aprobación)",
      timestamp: getTimestamp(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input, timestamp: getTimestamp() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const content = data?.content || data?.error || "Sin respuesta.";
      setMessages((prev) => [...prev, { role: "assistant", content, timestamp: getTimestamp() }]);

      // Persist message history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("chat_messages").insert([
          { user_id: user.id, role: "user", content: userMsg.content },
          { user_id: user.id, role: "assistant", content },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${e.message || "Error"}`, timestamp: getTimestamp() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="border-b px-4 py-3 flex items-center gap-3 bg-card">
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-heading text-sm font-semibold">ThreadOps AI</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Pensando..." : "En línea · Con acceso a tus datos"}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("flex gap-2 max-w-[75%]", msg.role === "user" && "flex-row-reverse")}>
              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1", msg.role === "user" ? "bg-foreground/10" : "bg-primary")}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary-foreground" />}
              </div>
              <div>
                <div className={cn("rounded-2xl px-4 py-2.5 text-sm leading-relaxed", msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border rounded-tl-sm shadow-sm")}>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                {msg.timestamp && (
                  <p className={cn("text-[10px] text-muted-foreground mt-1", msg.role === "user" && "text-right")}>{msg.timestamp}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[75%]">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="bg-card border rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-3 bg-card">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Paperclip className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Camera className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Mic className="h-4 w-4" /></Button>
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full bg-muted border-0"
            disabled={isLoading}
          />
          <Button onClick={handleSend} size="icon" className="h-9 w-9 rounded-full" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
