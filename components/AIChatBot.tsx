"use client";
// Component: components/AIChatBot.tsx
// Plain React chatbot — no useChat dependency issues

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Loader2, Sparkles, Minimize2, Maximize2, Trash2, Bot, User } from "lucide-react";

interface Msg { id: string; role: "user" | "assistant"; content: string; }

const QUICK = [
  "Explain CTC breakdown for ₹12 LPA",
  "Calculate PF for basic ₹30,000",
  "Leave types and entitlements in India",
  "How to onboard a new employee",
  "Current income tax slabs",
  "ESIC eligibility and rates",
];

export default function AIChatBot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { id: "w", role: "assistant", content: "👋 Hi! I'm NorthBot, your AI HR assistant.\n\nAsk me about salary, leave, compliance, onboarding — anything HR!\n\nTry a quick question below or type your own." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);
  useEffect(() => { if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Msg = { id: Date.now().toString(), role: "user", content: msg };
    const history = [...messages.filter(m => m.id !== "w"), userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });

      const contentType = res.headers.get("content-type") || "";
      const asstId = (Date.now() + 1).toString();

      if (contentType.includes("application/json")) {
        // Rule-based KB response (plain JSON)
        const data = await res.json();
        setMessages(prev => [...prev, { id: asstId, role: "assistant", content: data.content || "Sorry, try again." }]);
      } else {
        // Streaming response (Vercel AI Gateway)
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        setMessages(prev => [...prev, { id: asstId, role: "assistant", content: "" }]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (line.startsWith("0:")) {
                try { fullText += JSON.parse(line.slice(2)); setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: fullText } : m)); } catch {}
              }
            }
          }
          if (!fullText) setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: "No response. Try again." } : m));
        }
      }
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Connection error. Try again." }]);
    } finally { setLoading(false); }
  }, [input, loading, messages]);

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center text-white hover:shadow-xl hover:scale-105 transition-all group">
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Ask NorthBot</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${expanded ? "w-[580px] h-[640px]" : "w-[380px] h-[540px]"} flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur"><Sparkles className="w-4 h-4 text-white" /></div>
          <div><h3 className="text-sm font-bold text-white">NorthBot</h3><p className="text-[10px] text-indigo-200">AI HR Assistant</p></div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setMessages([{ id: "w", role: "assistant", content: "Chat cleared! How can I help?" }])} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition">{expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
          <button onClick={() => setOpen(false)} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50/50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === "assistant" ? "bg-indigo-100 text-indigo-600" : "bg-gray-800 text-white"}`}>
              {msg.role === "assistant" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
            </div>
            <div className={`max-w-[85%]`}>
              <div className={`inline-block px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "bg-indigo-600 text-white rounded-br-md" : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"
              }`}>{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0"><Bot className="w-3 h-3" /></div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-3 py-2.5">
              <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} /><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} /><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} /></div>
            </div>
          </div>
        )}
        {messages.length <= 1 && !loading && (
          <div className="pt-1">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Quick questions</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-full text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition">{q}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
            placeholder="Ask about HR, payroll, compliance..."
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition flex-shrink-0">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[8px] text-gray-400 text-center mt-1">Powered by Vercel AI Gateway</p>
      </div>
    </div>
  );
}