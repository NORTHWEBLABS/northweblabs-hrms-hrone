"use client";
// Component: components/AIChatBot.tsx
// Interactive AI chatbot with charts, actions, reports

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, Sparkles, Minimize2, Maximize2, Trash2, Bot, User } from "lucide-react";

interface Message { id: string; role: "user" | "assistant"; content: string; timestamp: Date; chart?: ChartData; }
interface ChartData { type: "pie" | "bar" | "donut"; title: string; labels: string[]; values: number[]; colors: string[]; }

const SUGGESTIONS = [
  "show employees", "show attendance", "calculate ctc 1200000",
  "check in", "leave policy", "calc pf 50000", "help",
];

// ── INLINE CHART ──
function MiniChart({ chart }: { chart: ChartData }) {
  const total = chart.values.reduce((s, v) => s + v, 0);
  if (total === 0) return <p className="text-xs text-gray-400 italic mt-2">No data to display</p>;

  if (chart.type === "pie" || chart.type === "donut") {
    let cumulative = 0;
    const size = 120, cx = 60, cy = 60, r = 50, ir = chart.type === "donut" ? 30 : 0;
    const slices = chart.values.map((v, i) => {
      const pct = v / total;
      const start = cumulative * Math.PI * 2 - Math.PI / 2;
      cumulative += pct;
      const end = cumulative * Math.PI * 2 - Math.PI / 2;
      const large = pct > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      if (ir > 0) {
        const ix1 = cx + ir * Math.cos(start), iy1 = cy + ir * Math.sin(start);
        const ix2 = cx + ir * Math.cos(end), iy2 = cy + ir * Math.sin(end);
        return <path key={i} d={`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large} 0 ${ix1},${iy1}Z`} fill={chart.colors[i % chart.colors.length]} />;
      }
      return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}Z`} fill={chart.colors[i % chart.colors.length]} />;
    });

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-xl">
        <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{chart.title}</p>
        <div className="flex items-center gap-3">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{slices}</svg>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {chart.labels.map((l, i) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: chart.colors[i % chart.colors.length] }} />
                <span className="text-[10px] text-gray-600 truncate flex-1">{l}</span>
                <span className="text-[10px] font-bold text-gray-900">{chart.values[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Bar chart
  const max = Math.max(...chart.values, 1);
  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-xl">
      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{chart.title}</p>
      <div className="flex items-end gap-1.5 h-20">
        {chart.values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-bold text-gray-700">{v}</span>
            <div className="w-full rounded-t-md transition-all" style={{ height: `${(v / max) * 100}%`, background: chart.colors[i % chart.colors.length], minHeight: v > 0 ? 4 : 0 }} />
            <span className="text-[8px] text-gray-500 truncate w-full text-center">{chart.labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIChatBot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);
  useEffect(() => { if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: "welcome", role: "assistant", timestamp: new Date(),
        content: "👋 Hi! I'm NorthBot, your HRMS assistant.\n\nI can answer questions, run reports with charts, and even perform actions like marking attendance.\n\nTry: 'show employees', 'calc ctc 1200000', or 'check in'" }]);
    }
  }, [open, messages.length]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, timestamp: new Date() };
    setMessages(p => [...p, userMsg]);
    setInput(""); setLoading(true);

    try {
      const history = [...messages, userMsg].filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content }));
      const context = { orgId: localStorage.getItem("activeOrgId") || "", email: localStorage.getItem("userEmail") || "" };

      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context }),
      });
      const data = await res.json();

      setMessages(p => [...p, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: data.content || "Sorry, try again.",
        timestamp: new Date(), chart: data.chart || undefined,
      }]);
    } catch {
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: "Connection error. Try again.", timestamp: new Date() }]);
    } finally { setLoading(false); }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const fmtTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center text-white hover:shadow-xl hover:scale-105 transition-all group">
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Ask NorthBot</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${expanded ? "w-[560px] h-[620px]" : "w-[370px] h-[520px]"} flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur"><Sparkles className="w-4 h-4 text-white" /></div>
          <div><h3 className="text-sm font-bold text-white">NorthBot</h3><p className="text-[10px] text-indigo-200">Ask anything · Reports · Actions</p></div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => { setMessages([]); }} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition" title="Clear"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <div className={`max-w-[85%] ${msg.role === "user" ? "text-right" : ""}`}>
              <div className={`inline-block px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "bg-indigo-600 text-white rounded-br-md" : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md"
              }`}>{msg.content}</div>
              {msg.chart && <MiniChart chart={msg.chart} />}
              <p className="text-[9px] text-gray-400 mt-0.5 px-1">{fmtTime(msg.timestamp)}</p>
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
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 px-1">Try these</p>
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition">{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-end gap-1.5">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask, calculate, or run a report..."
            rows={1} className="flex-1 resize-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 max-h-20" style={{ minHeight: "36px" }} />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition flex-shrink-0">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[8px] text-gray-400 text-center mt-1">NorthBot · Free · No API key needed</p>
      </div>
    </div>
  );
}