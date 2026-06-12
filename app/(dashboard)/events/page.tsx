"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  ChevronLeft, ChevronRight, Plus, X, Cake,
  Loader2, AlertCircle, CheckCircle2, Calendar,
  Gift, Flag, Briefcase, Trash2, User,
} from "lucide-react";

function useSupabase() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Employee {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  department: string | null;
}

interface CompanyEvent {
  id: string;
  title: string;
  date: string;
  type: "birthday" | "holiday" | "festival" | "company" | "other";
  note: string | null;
  recurring: boolean;
}

interface DayEvent {
  type: "birthday" | "holiday" | "festival" | "company" | "other";
  label: string;
  sublabel?: string;
  id: string;
  deletable: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  birthday: { color: "text-pink-700",    bg: "bg-pink-50",     border: "border-pink-200",    dot: "bg-pink-400",     icon: <Cake className="w-3.5 h-3.5"/>      },
  holiday:  { color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",    dot: "bg-blue-400",     icon: <Flag className="w-3.5 h-3.5"/>      },
  festival: { color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200",  dot: "bg-purple-400",   icon: <Gift className="w-3.5 h-3.5"/>      },
  company:  { color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-400",  icon: <Briefcase className="w-3.5 h-3.5"/> },
  other:    { color: "text-gray-600",    bg: "bg-gray-50",     border: "border-gray-200",    dot: "bg-gray-400",     icon: <Calendar className="w-3.5 h-3.5"/> },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const INDIA_HOLIDAYS: { title: string; month: number; day: number; type: "holiday" | "festival" }[] = [
  { title: "Republic Day",     month: 1,  day: 26, type: "holiday"  },
  { title: "Holi",             month: 3,  day: 25, type: "festival" },
  { title: "Good Friday",      month: 4,  day: 18, type: "holiday"  },
  { title: "Independence Day", month: 8,  day: 15, type: "holiday"  },
  { title: "Gandhi Jayanti",   month: 10, day: 2,  type: "holiday"  },
  { title: "Dussehra",         month: 10, day: 2,  type: "festival" },
  { title: "Diwali",           month: 10, day: 20, type: "festival" },
  { title: "Christmas",        month: 12, day: 25, type: "festival" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string as a local date (avoids UTC-offset day shift).
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayStr(): string {
  return toDateStr(new Date());
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function avatarBg(name: string) {
  const c = [
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-purple-100 text-purple-700",
  ];
  return c[name.charCodeAt(0) % c.length];
}

function fmtDate(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
      ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {message}
      <button onClick={onClose}><X className="w-3.5 h-3.5 opacity-50" /></button>
    </div>
  );
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────
function AddEventModal({ onSave, onClose, orgId, prefillDate, employees }: {
  onSave: (e: CompanyEvent) => void;
  onClose: () => void;
  orgId: string;
  prefillDate?: string;
  employees: Employee[];
}) {
  const supabase = useSupabase();
  const [title, setTitle]         = useState("");
  const [date, setDate]           = useState(prefillDate || "");
  const [type, setType]           = useState<CompanyEvent["type"]>("holiday");
  const [note, setNote]           = useState("");
  const [recurring, setRecurring] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState("");

  // When type switches to birthday, auto-fill from selected employee
  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setTitle(emp.full_name);
      if (emp.date_of_birth) {
        // Use month/day from DOB, set year to current
        const dob = parseLocalDate(emp.date_of_birth);
        const thisYear = new Date().getFullYear();
        const mm = String(dob.getMonth() + 1).padStart(2, "0");
        const dd = String(dob.getDate()).padStart(2, "0");
        setDate(`${thisYear}-${mm}-${dd}`);
      }
      setRecurring(true);
    }
  };

  const save = async () => {
    if (type === "birthday" && !selectedEmpId && !title.trim()) {
      setError("Select an employee or enter a name");
      return;
    }
    if (!title.trim()) { setError("Title required"); return; }
    if (!date) { setError("Date required"); return; }
    setSaving(true);
    try {
      const { data, error: err } = await supabase
        .from("company_events")
        .insert({ org_id: orgId, title: title.trim(), date, type, note: note || null, recurring })
        .select()
        .single();
      if (err) throw err;
      onSave(data as CompanyEvent);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Add event</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
            <select
              value={type}
              onChange={e => {
                setType(e.target.value as CompanyEvent["type"]);
                setError("");
                setTitle("");
                setSelectedEmpId("");
                setDate(prefillDate || "");
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="birthday">Birthday</option>
              <option value="holiday">Public Holiday</option>
              <option value="festival">Festival</option>
              <option value="company">Company Event</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Birthday — employee picker */}
          {type === "birthday" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Employee <span className="text-gray-400 font-normal">(optional — fills name & date)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedEmpId}
                  onChange={e => handleEmployeeChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}{emp.department ? ` — ${emp.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {type === "birthday" ? "Name" : "Title"} <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setError(""); }}
              placeholder={type === "birthday" ? "e.g. Jane Doe" : "e.g. Diwali, Foundation Day"}
              autoFocus={type !== "birthday"}
              className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200
                ${error && !title ? "border-red-300" : "border-gray-200"}`}
            />
          </div>

          {/* Date & recurring */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); setError(""); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none py-2">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={e => setRecurring(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4"
                />
                <span className="text-xs text-gray-600">Repeat yearly</span>
              </label>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Additional details..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-[#1e293b] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────
function DayPanel({ date, events, onClose, onAddEvent, onDelete }: {
  date: Date;
  events: DayEvent[];
  onClose: () => void;
  onAddEvent: (date: string) => void;
  onDelete: (id: string) => void;
}) {
  const dateStr = toDateStr(date);
  const isToday = dateStr === todayStr();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-base font-bold ${isToday ? "text-indigo-700" : "text-gray-900"}`}>
            {date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {isToday && <span className="text-xs text-indigo-500 font-medium">Today</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddEvent(dateStr)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Add event
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No events on this day</p>
          <button onClick={() => onAddEvent(dateStr)} className="text-xs text-indigo-600 hover:underline mt-1 font-medium">
            Add one
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map(ev => {
            const cfg = TYPE_CONFIG[ev.type];
            return (
              <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <div className={`flex-shrink-0 ${cfg.color}`}>{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${cfg.color}`}>{ev.label}</p>
                  {ev.sublabel && <p className="text-xs text-gray-500 mt-0.5">{ev.sublabel}</p>}
                </div>
                {ev.deletable && (
                  <button onClick={() => onDelete(ev.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const supabase = useSupabase();
  const today = new Date();

  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [orgId, setOrgId] = useState("");
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [events, setEvents]             = useState<CompanyEvent[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPrefillDate, setAddPrefillDate] = useState("");
  const [toast, setToast]   = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [view, setView]     = useState<"calendar" | "list">("calendar");

  // ── Resolve org ──────────────────────────────────────────────────────────────
  const resolveOrg = useCallback(async (): Promise<string> => {
    if (orgId) return orgId;
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("activeOrgId");
      if (s) { setOrgId(s); return s; }
    }
    const { data: f } = await supabase.from("organizations").select("id").order("created_at").limit(1).maybeSingle();
    if (f?.id) { setOrgId(f.id); return f.id; }
    return "";
  }, [orgId, supabase]);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const oid = await resolveOrg();
      if (!oid) return;
      const [{ data: emps }, { data: evts }] = await Promise.all([
        supabase.from("employees").select("id,full_name,date_of_birth,department").eq("org_id", oid).eq("status", "active"),
        supabase.from("company_events").select("*").eq("org_id", oid).order("date"),
      ]);
      setEmployees((emps || []) as Employee[]);
      setEvents((evts || []) as CompanyEvent[]);
    } finally {
      setLoading(false);
    }
  }, [resolveOrg, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Build event map ──────────────────────────────────────────────────────────
  const eventMap = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};

    const addEvent = (dateStr: string, ev: DayEvent) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(ev);
    };

    // Employee birthdays — match month/day for current year using parseLocalDate
    employees.forEach(emp => {
      if (!emp.date_of_birth) return;
      const dob = parseLocalDate(emp.date_of_birth);
      const mm = String(dob.getMonth() + 1).padStart(2, "0");
      const dd = String(dob.getDate()).padStart(2, "0");
      const thisYearBday = `${year}-${mm}-${dd}`;
      addEvent(thisYearBday, {
        type: "birthday",
        label: emp.full_name,
        sublabel: emp.department || undefined,
        id: `bday-${emp.id}`,
        deletable: false,
      });
    });

    // Company events — handle recurring (match month/day) and one-off (exact date)
    events.forEach(ev => {
      if (ev.recurring) {
        const d = parseLocalDate(ev.date);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const thisYear = `${year}-${mm}-${dd}`;
        addEvent(thisYear, { type: ev.type, label: ev.title, sublabel: ev.note || undefined, id: ev.id, deletable: true });
      } else {
        if (ev.date.startsWith(String(year))) {
          addEvent(ev.date, { type: ev.type, label: ev.title, sublabel: ev.note || undefined, id: ev.id, deletable: true });
        }
      }
    });

    // India default holidays (built-in, not deletable)
    INDIA_HOLIDAYS.forEach(h => {
      const mm = String(h.month).padStart(2, "0");
      const dd = String(h.day).padStart(2, "0");
      const dateStr = `${year}-${mm}-${dd}`;
      addEvent(dateStr, { type: h.type, label: h.title, id: `holiday-${h.title}`, deletable: false });
    });

    return map;
  }, [employees, events, year]);

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // ── Delete event ─────────────────────────────────────────────────────────────
  const deleteEvent = async (id: string) => {
    if (id.startsWith("bday-") || id.startsWith("holiday-")) return;
    const { error } = await supabase.from("company_events").delete().eq("id", id);
    if (error) { setToast({ message: "Failed to delete", type: "error" }); return; }
    setEvents(p => p.filter(e => e.id !== id));
    setToast({ message: "Event deleted", type: "success" });
  };

  // ── Upcoming events (list view) ──────────────────────────────────────────────
  const upcomingEvents = useMemo(() => {
    const t = todayStr();
    return Object.entries(eventMap)
      .filter(([d]) => d >= t)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 25)
      .flatMap(([date, evs]) => evs.map(ev => ({ ...ev, date })));
  }, [eventMap]);

  // ── This month birthdays ─────────────────────────────────────────────────────
  const thisMonthBirthdays = useMemo(() => {
    return Object.entries(eventMap)
      .filter(([d]) => {
        const [y, m] = d.split("-").map(Number);
        return y === year && m - 1 === month;
      })
      .flatMap(([date, evs]) => evs.filter(e => e.type === "birthday").map(ev => ({ ...ev, date })))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [eventMap, year, month]);

  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : "";
  const selectedEvents  = selectedDate ? (eventMap[selectedDateStr] || []) : [];

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Events &amp; Birthdays</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {thisMonthBirthdays.length} birthday{thisMonthBirthdays.length !== 1 ? "s" : ""} in {MONTHS[month]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {(["calendar", "list"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                  ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={async () => {
              const oid = await resolveOrg();
              if (!oid) { setToast({ message: "No organization found", type: "error" }); return; }
              setAddPrefillDate("");
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <Plus className="w-4 h-4" />Add event
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          <span className="text-sm text-gray-500">Loading events...</span>
        </div>
      ) : (
        <>
          {/* ── Calendar view ── */}
          {view === "calendar" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

              {/* Calendar grid */}
              <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Month nav */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <p className="text-sm font-bold text-gray-900">{MONTHS[month]} {year}</p>
                  <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-gray-100">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDayOffset }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50/30" />
                  ))}

                  {days.map(day => {
                    const ds = toDateStr(day);
                    const dayEvents = eventMap[ds] || [];
                    const isToday = ds === todayStr();
                    const isSelected = ds === selectedDateStr;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                      <div
                        key={ds}
                        onClick={() => setSelectedDate(isSelected ? null : day)}
                        className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors flex flex-col
                          ${isSelected ? "bg-indigo-50" : isWeekend ? "bg-gray-50/40 hover:bg-gray-50" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center justify-end mb-1">
                          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                            ${isToday ? "bg-indigo-600 text-white" : isSelected ? "text-indigo-700" : isWeekend ? "text-gray-400" : "text-gray-700"}`}>
                            {day.getDate()}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5 flex-1">
                          {dayEvents.slice(0, 3).map((ev, i) => {
                            const cfg = TYPE_CONFIG[ev.type];
                            return (
                              <div key={i} className={`px-1.5 py-0.5 rounded text-xs font-medium truncate ${cfg.bg} ${cfg.color}`}>
                                {ev.label}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right panel */}
              <div className="flex flex-col gap-4">
                {selectedDate ? (
                  <DayPanel
                    date={selectedDate}
                    events={selectedEvents}
                    onClose={() => setSelectedDate(null)}
                    onAddEvent={async (d) => {
                      const oid = await resolveOrg();
                      if (oid) { setAddPrefillDate(d); setShowAddModal(true); }
                    }}
                    onDelete={deleteEvent}
                  />
                ) : (
                  /* Birthdays this month */
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                      <Cake className="w-4 h-4 text-pink-500" />
                      <h3 className="text-sm font-semibold text-gray-800">Birthdays in {MONTHS[month]}</h3>
                    </div>
                    {thisMonthBirthdays.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <Cake className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No birthdays this month</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {thisMonthBirthdays.map(ev => (
                          <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-pink-50/30 transition-colors">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarBg(ev.label)}`}>
                              {getInitials(ev.label)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{ev.label}</p>
                              <p className="text-xs text-gray-400">{fmtDate(ev.date)}{ev.sublabel ? ` · ${ev.sublabel}` : ""}</p>
                            </div>
                            <Cake className="w-4 h-4 text-pink-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Legend */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Legend</p>
                  <div className="flex flex-col gap-2">
                    {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([key, cfg]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded ${cfg.bg} flex items-center justify-center ${cfg.color}`}>{cfg.icon}</div>
                        <span className="text-xs text-gray-600">
                          {key === "birthday" ? "Birthday" : key === "holiday" ? "Public Holiday" : key === "festival" ? "Festival" : key === "company" ? "Company Event" : "Other"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── List view ── */}
          {view === "list" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Upcoming events</h3>
                <span className="text-xs text-gray-400">{upcomingEvents.length} events</span>
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Calendar className="w-8 h-8 text-gray-300" />
                  <p className="text-sm text-gray-500">No upcoming events</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingEvents.map((ev, i) => {
                    const cfg = TYPE_CONFIG[ev.type];
                    const t = todayStr();
                    const isToday = ev.date === t;
                    const evDate = parseLocalDate(ev.date);
                    const daysUntil = Math.ceil((evDate.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={`${ev.id}-${i}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex flex-col items-center justify-center flex-shrink-0`}>
                          <span className={`text-xs font-bold leading-tight ${cfg.color}`}>
                            {evDate.toLocaleDateString("en-IN", { day: "numeric" })}
                          </span>
                          <span className={`text-xs leading-tight ${cfg.color} opacity-70`}>
                            {evDate.toLocaleDateString("en-IN", { month: "short" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{ev.label}</p>
                          {ev.sublabel && <p className="text-xs text-gray-400 mt-0.5">{ev.sublabel}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {isToday ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                          </span>
                          {ev.deletable && (
                            <button onClick={() => deleteEvent(ev.id)} className="p-1 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add event modal */}
      {showAddModal && (
        <AddEventModal
          orgId={orgId}
          prefillDate={addPrefillDate}
          employees={employees}
          onSave={ev => {
            setEvents(p => [...p, ev]);
            setShowAddModal(false);
            setToast({ message: `"${ev.title}" added`, type: "success" });
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}