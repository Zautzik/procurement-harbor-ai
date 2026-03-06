import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Camera, Mic, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatMessages, type ChatMessage } from "@/data/mockData";
import { cn } from "@/lib/utils";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate bot response
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: "bot",
        content: "Procesando tu solicitud... 🔄\n\nEsta es una respuesta de demostración. Cuando conectemos Lovable Cloud + IA, las respuestas serán inteligentes y contextuales.",
        timestamp: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 bg-card">
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-heading text-sm font-semibold">ThreadOps AI</h2>
          <p className="text-xs text-muted-foreground">En línea · Asistente de procurement</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("flex gap-2 max-w-[75%]", msg.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                msg.role === "user" ? "bg-foreground/10" : "bg-primary"
              )}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary-foreground" />}
              </div>
              <div>
                <div className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border rounded-tl-sm shadow-sm"
                )}>
                  {msg.content.split("\n").map((line, i) => (
                    <p key={i} className={cn(line === "" && "h-2")}>
                      {line.split("**").map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>

                {/* Action Buttons */}
                {msg.actions && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.actions.map((action) => (
                      <Button key={action.label} variant="outline" size="sm" className="text-xs h-7 rounded-full">
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                <p className={cn("text-[10px] text-muted-foreground mt-1", msg.role === "user" && "text-right")}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-3 bg-card">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Camera className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full bg-muted border-0"
          />
          <Button onClick={handleSend} size="icon" className="h-9 w-9 rounded-full" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
