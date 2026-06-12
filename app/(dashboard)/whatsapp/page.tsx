"use client";
// Route: app/(dashboard)/whatsapp/page.tsx
// WhatsApp Bot Dashboard — Conversations, Broadcasts, Templates, Attendance Logs

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  MessageCircle, Send, Users, Search, X, Loader2,
  AlertCircle, Clock, Check, CheckCheck,
  FileText, Megaphone, MapPin,
  RefreshCw,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }
async function getOrgId(sb: any): Promise<string> {
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) { const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle(); if (data?.org_id) { localStorage.setItem("activeOrgId", data.org_id); return data.org_id; } }
  return "";
}

interface Contact { id: string; phone: string; name: string | null; type: string; opted_in: boolean; last_message_at: string | null; }
interface Message { id: string; contact_id: string; direction: string; message_type: string; content: string | null; template_name: string | null; status: string; created_at: string; }
interface Template { id: string; name: string; category: string; body: string; variables: string[] | null; status: string; }
interface Broadcast { id: string; name: string; template_id: string | null; recipients: number; sent: number; delivered: number; read: number; failed: number; status: string; created_at: string; }
interface AttLog { id: string; phone: string; action: string; message: string | null; location_lat: number | null; location_lng: number | null; processed: boolean; created_at: string; }

const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtDateTime = (d: string) => `${fmtDate(d)} ${fmtTime(d)}`;

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: color + "12", color }}>{icon}</div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function WhatsAppPage() {
  const sb = useSB();
  const [tab, setTab] = useState<"conversations" | "broadcasts" | "templates" | "attendance">("conversations");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [attLogs, setAttLogs] = useState<AttLog[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newMsg, setNewMsg] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const oid = await getOrgId(sb);
    if (!oid) { setLoading(false); return; }
    const [r1, r2, r3, r4, r5] = await Promise.all([
      sb.from("wa_contacts").select("*").eq("org_id", oid).order("last_message_at", { ascending: false, nullsFirst: false }),
      sb.from("wa_messages").select("*").eq("org_id", oid).order("created_at", { ascending: false }).limit(500),
      sb.from("wa_templates").select("*").eq("org_id", oid).order("name"),
      sb.from("wa_broadcasts").select("*").eq("org_id", oid).order("created_at", { ascending: false }),
      sb.from("wa_attendance_logs").select("*").eq("org_id", oid).order("created_at", { ascending: false }).limit(100),
    ]);
    setContacts((r1.data || []) as Contact[]); setMessages((r2.data || []) as Message[]);
    setTemplates((r3.data || []) as Template[]); setBroadcasts((r4.data || []) as Broadcast[]);
    setAttLogs((r5.data || []) as AttLog[]); setLoading(false);
  }, [sb]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const contactMessages = useMemo(() => {
    if (!selectedContact) return [];
    return messages.filter(m => m.contact_id === selectedContact.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [selectedContact, messages]);

  const filteredContacts = contacts.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  const totalMessages = messages.length;
  const todayMessages = messages.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString()).length;

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedContact) return;
    const oid = await getOrgId(sb);
    const { data } = await sb.from("wa_messages").insert({
      org_id: oid, contact_id: selectedContact.id, direction: "outbound",
      message_type: "text", content: newMsg.trim(), status: "sent",
    }).select().single();
    if (data) {
      setMessages(p => [...p, data as Message]);
      setNewMsg("");
      await sb.from("wa_contacts").update({ last_message_at: new Date().toISOString() }).eq("id", selectedContact.id);
    }
  };

  const statusIcon = (s: string) => {
    if (s === "read") return <CheckCheck className="w-3 h-3 text-blue-500" />;
    if (s === "delivered") return <CheckCheck className="w-3 h-3 text-gray-400" />;
    if (s === "sent") return <Check className="w-3 h-3 text-gray-400" />;
    if (s === "failed") return <AlertCircle className="w-3 h-3 text-red-500" />;
    return <Clock className="w-3 h-3 text-gray-300" />;
  };

  const TABS = [
    { id: "conversations" as const, label: "Conversations", icon: <MessageCircle className="w-4 h-4" />, count: contacts.length },
    { id: "broadcasts" as const, label: "Broadcasts", icon: <Megaphone className="w-4 h-4" />, count: broadcasts.length },
    { id: "templates" as const, label: "Templates", icon: <FileText className="w-4 h-4" />, count: templates.length },
    { id: "attendance" as const, label: "Bot Attendance", icon: <MapPin className="w-4 h-4" />, count: attLogs.length },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><MessageCircle className="w-5 h-5" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">WhatsApp Bot</h1><p className="text-sm text-gray-400">Conversations, broadcasts & attendance</p></div>
        </div>
        <button onClick={fetchAll} className="p-2 hover:bg-gray-100 rounded-xl"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Contacts" value={contacts.length.toString()} sub={`${contacts.filter(c => c.opted_in).length} opted in`} icon={<Users className="w-5 h-5" />} color="#22C55E" />
        <StatCard label="Messages today" value={todayMessages.toString()} sub={`${totalMessages} total`} icon={<MessageCircle className="w-5 h-5" />} color="#6366F1" />
        <StatCard label="Broadcasts" value={broadcasts.length.toString()} sub={`${broadcasts.filter(b => b.status === "completed").length} completed`} icon={<Megaphone className="w-5 h-5" />} color="#F59E0B" />
        <StatCard label="Bot check-ins" value={attLogs.filter(a => a.action === "check_in").length.toString()} sub="via WhatsApp" icon={<MapPin className="w-5 h-5" />} color="#8B5CF6" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${tab === t.id ? "text-emerald-600" : "text-gray-500 hover:text-gray-700"}`}>
            {t.icon}{t.label}
            {t.count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t" />}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div> : (
        <>
          {/* CONVERSATIONS */}
          {tab === "conversations" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex" style={{ height: 520 }}>
              {/* Contact list */}
              <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
                <div className="p-3 border-b border-gray-100">
                  <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200" /></div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredContacts.length === 0 ? <p className="text-xs text-gray-400 text-center py-8">No contacts</p> :
                    filteredContacts.map(c => {
                      const lastMsg = messages.find(m => m.contact_id === c.id);
                      const isSelected = selectedContact?.id === c.id;
                      const unread = messages.filter(m => m.contact_id === c.id && m.direction === "inbound" && m.status !== "read").length;
                      return (
                        <button key={c.id} onClick={() => setSelectedContact(c)}
                          className={`w-full text-left px-3 py-3 border-b border-gray-50 flex items-center gap-3 transition ${isSelected ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
                            {(c.name || c.phone).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">{c.name || c.phone}</p>
                              {c.last_message_at && <span className="text-[10px] text-gray-400">{fmtTime(c.last_message_at)}</span>}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{lastMsg?.content || c.phone}</p>
                          </div>
                          {unread > 0 && <span className="w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0">{unread}</span>}
                        </button>
                      );
                    })
                  }
                </div>
              </div>

              {/* Chat area */}
              <div className="flex-1 flex flex-col">
                {!selectedContact ? (
                  <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">Select a conversation</p></div></div>
                ) : (
                  <>
                    {/* Chat header */}
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold">{(selectedContact.name || selectedContact.phone).slice(0, 2).toUpperCase()}</div>
                      <div className="flex-1"><p className="text-sm font-bold text-gray-900">{selectedContact.name || selectedContact.phone}</p><p className="text-xs text-gray-400">{selectedContact.phone} · {selectedContact.type}</p></div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${selectedContact.opted_in ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{selectedContact.opted_in ? "Opted in" : "Opted out"}</span>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                      {contactMessages.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No messages yet</p>}
                      {contactMessages.map(m => (
                        <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${m.direction === "outbound" ? "bg-emerald-500 text-white rounded-br-sm" : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"}`}>
                            {m.template_name && <p className="text-[10px] opacity-70 mb-0.5">[Template: {m.template_name}]</p>}
                            <p>{m.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${m.direction === "outbound" ? "text-emerald-200" : "text-gray-400"}`}>
                              <span className="text-[10px]">{fmtTime(m.created_at)}</span>
                              {m.direction === "outbound" && statusIcon(m.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Input */}
                    <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                      <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type a message…" className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                      <button onClick={sendMessage} disabled={!newMsg.trim()} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl disabled:opacity-30 hover:bg-emerald-600"><Send className="w-4 h-4" /></button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* BROADCASTS */}
          {tab === "broadcasts" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {broadcasts.length === 0 ? (
                <div className="text-center py-16"><Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">No broadcasts yet</p></div>
              ) : (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                  {["Campaign", "Status", "Recipients", "Sent", "Delivered", "Read", "Failed", "Date"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>)}
                </tr></thead><tbody className="divide-y divide-gray-100">
                  {broadcasts.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5"><p className="text-sm font-semibold text-gray-900">{b.name}</p></td>
                      <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.status === "completed" ? "bg-emerald-100 text-emerald-700" : b.status === "sending" ? "bg-blue-100 text-blue-700" : b.status === "failed" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>{b.status}</span></td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{b.recipients}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{b.sent}</td>
                      <td className="px-5 py-3.5 text-sm text-emerald-600 font-medium">{b.delivered}</td>
                      <td className="px-5 py-3.5 text-sm text-blue-600 font-medium">{b.read}</td>
                      <td className="px-5 py-3.5 text-sm text-red-500">{b.failed}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{fmtDateTime(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody></table></div>
              )}
            </div>
          )}

          {/* TEMPLATES */}
          {tab === "templates" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {templates.length === 0 ? <p className="col-span-2 text-sm text-gray-400 text-center py-16">No templates</p> :
                templates.map(t => (
                  <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div><p className="text-sm font-bold text-gray-900">{t.name.replace(/_/g, " ")}</p><p className="text-xs text-gray-400 capitalize">{t.category}</p></div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.status === "approved" ? "bg-emerald-100 text-emerald-700" : t.status === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>{t.status}</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{t.body}</p>
                    </div>
                    {t.variables && t.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.variables.map(v => <span key={v} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full font-mono">{`{{${v}}}`}</span>)}
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          )}

          {/* ATTENDANCE LOGS */}
          {tab === "attendance" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {attLogs.length === 0 ? (
                <div className="text-center py-16"><MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-500">No attendance logs from WhatsApp bot</p></div>
              ) : (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                  {["Time", "Phone", "Action", "Message", "Location", "Status"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>)}
                </tr></thead><tbody className="divide-y divide-gray-100">
                  {attLogs.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(a.created_at)}</td>
                      <td className="px-5 py-3.5 text-sm font-mono text-gray-700">{a.phone}</td>
                      <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${a.action === "check_in" ? "bg-emerald-100 text-emerald-700" : a.action === "check_out" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{a.action.replace("_", " ")}</span></td>
                      <td className="px-5 py-3.5 text-xs text-gray-600 max-w-[200px] truncate">{a.message || "—"}</td>
                      <td className="px-5 py-3.5">{a.location_lat ? <span className="text-xs text-indigo-600 flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location_lat.toFixed(4)}, {a.location_lng?.toFixed(4)}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                      <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.processed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{a.processed ? "Processed" : "Pending"}</span></td>
                    </tr>
                  ))}
                </tbody></table></div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}