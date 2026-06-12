"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Check, X, Clock, AlertCircle,
  Upload, Download, RefreshCw, Loader2, CheckCircle2,
  Users, UserCheck, UserX, Coffee, Calendar, Edit2,
  ChevronDown, Search, Wifi, ArrowRight,
} from "lucide-react";

// ─── PREVIEW MODE ─────────────────────────────────────────────────────────────
// This is the marketing-site preview of the Attendance module.
// All Supabase calls are replaced with in-memory mock data. Nothing persists.

// ─── Types ────────────────────────────────────────────────────────────────────
type AttendanceStatus = "present" | "absent" | "half_day" | "holiday" | "weekly_off" | "late";

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
  employee_code: string | null;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  source: "whatsapp" | "web" | "manual";
  notes: string | null;
}

// key: `${employeeId}_${date}` → record
type AttendanceMap = Record<string, AttendanceRecord>;

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<AttendanceStatus, { label: string; short: string; bg: string; text: string; border: string; dot: string }> = {
  present:    { label: "Present",    short: "P",  bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  absent:     { label: "Absent",     short: "A",  bg: "bg-red-100",     text: "text-red-600",     border: "border-red-200",     dot: "bg-red-500"     },
  half_day:   { label: "Half day",   short: "H",  bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400"   },
  late:       { label: "Late",       short: "L",  bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-400"  },
  holiday:    { label: "Holiday",    short: "Ho", bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-400"    },
  weekly_off: { label: "Weekly off", short: "W",  bg: "bg-gray-100",    text: "text-gray-500",    border: "border-gray-200",    dot: "bg-gray-300"    },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_EMPLOYEES: Employee[] = [
  { id: "e01", full_name: "Ananya Iyer",     department: "Engineering", employee_code: "NWL001" },
  { id: "e02", full_name: "Arjun Kapoor",    department: "Engineering", employee_code: "NWL002" },
  { id: "e03", full_name: "Priya Sharma",    department: "Design",      employee_code: "NWL003" },
  { id: "e04", full_name: "Rahul Verma",     department: "Finance",     employee_code: "NWL004" },
  { id: "e05", full_name: "Sneha Reddy",     department: "Engineering", employee_code: "NWL005" },
  { id: "e06", full_name: "Vikram Singh",    department: "Sales",       employee_code: "NWL006" },
  { id: "e07", full_name: "Meera Nair",      department: "Operations",  employee_code: "NWL007" },
  { id: "e08", full_name: "Karan Mehta",     department: "Sales",       employee_code: "NWL008" },
  { id: "e09", full_name: "Divya Pillai",    department: "Design",      employee_code: "NWL009" },
  { id: "e10", full_name: "Rohan Joshi",     department: "Operations",  employee_code: "NWL010" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const MOCK_NOTES = ["", "", "", "", "Work from home", "Client visit", "Doctor visit", ""];

function generateMockAttendance(year: number, month: number, todayStr: string): AttendanceMap {
  const map: AttendanceMap = {};
  const days = getMonthDays(year, month);

  MOCK_EMPLOYEES.forEach((emp, ei) => {
    days.forEach((d) => {
      const ds = isoDate(d);
      if (ds > todayStr) return; // never mark the future
      const dow = d.getDay();
      if (dow === 0 || dow === 6) return; // weekends left unmarked

      // Leave ~25% of today's entries unmarked so "Mark all present" has work to do
      if (ds === todayStr && (ei % 4 === 0)) return;

      const r = Math.random();
      let status: AttendanceStatus = "present";
      if (r > 0.94) status = "absent";
      else if (r > 0.89) status = "half_day";
      else if (r > 0.81) status = "late";

      const inH = status === "late" ? 10 : 9;
      const inM = Math.floor(Math.random() * 50);
      const check_in = status === "absent" ? null
        : `${ds}T${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}:00`;
      const outM = Math.floor(Math.random() * 50);
      const check_out = status === "absent" || ds === todayStr ? null
        : `${ds}T${status === "half_day" ? "13" : "18"}:${String(outM).padStart(2, "0")}:00`;

      map[`${emp.id}_${ds}`] = {
        id: uid(),
        employee_id: emp.id,
        date: ds,
        status,
        check_in,
        check_out,
        source: Math.random() < 0.3 ? "whatsapp" : "web",
        notes: MOCK_NOTES[Math.floor(Math.random() * MOCK_NOTES.length)] || null,
      };
    });
  });

  return map;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
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

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function avatarColor(name: string): string {
  const colors = ["bg-indigo-100 text-indigo-700", "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700", "bg-pink-100 text-pink-700"];
  return colors[name.charCodeAt(0) % colors.length];
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
      ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
      {message}
      <button onClick={onClose}><X className="w-3.5 h-3.5 opacity-50 hover:opacity-100" /></button>
    </div>
  );
}

// ─── Status Cell (single day cell in grid) ────────────────────────────────────
function StatusCell({
  record,
  isFuture,
  isWeekend,
  isToday,
  onClick,
}: {
  record: AttendanceRecord | null;
  isFuture: boolean;
  isWeekend: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  if (isFuture) {
    return (
      <div className={`h-8 w-full rounded flex items-center justify-center text-xs
        ${isToday ? "ring-2 ring-indigo-400 ring-offset-1" : ""}
        ${isWeekend ? "bg-gray-50" : "bg-white"} border border-gray-100 cursor-default`}>
        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
      </div>
    );
  }

  if (!record) {
    return (
      <button
        onClick={onClick}
        className={`h-8 w-full rounded flex items-center justify-center text-xs border border-dashed
          ${isWeekend ? "border-gray-200 bg-gray-50 text-gray-300" : "border-gray-300 bg-white text-gray-300 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-400"}
          ${isToday ? "ring-2 ring-indigo-400 ring-offset-1" : ""}
          transition-colors`}
        title="Click to mark attendance"
      >
        {isWeekend ? "—" : "+"}
      </button>
    );
  }

  const cfg = STATUS_CONFIG[record.status];
  return (
    <button
      onClick={onClick}
      title={`${cfg.label}${record.check_in ? " · In: " + fmtTime(record.check_in) : ""}${record.check_out ? " · Out: " + fmtTime(record.check_out) : ""}\nSource: ${record.source}`}
      className={`h-8 w-full rounded flex items-center justify-center text-xs font-semibold border
        ${cfg.bg} ${cfg.text} ${cfg.border}
        ${isToday ? "ring-2 ring-indigo-400 ring-offset-1" : ""}
        hover:opacity-80 transition-opacity relative`}
    >
      {cfg.short}
      {record.source === "whatsapp" && (
        <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-green-500" title="Marked via WhatsApp" />
      )}
    </button>
  );
}

// ─── Mark Attendance Modal ────────────────────────────────────────────────────
function MarkModal({
  employee,
  date,
  existing,
  onSave,
  onClose,
}: {
  employee: Employee;
  date: string;
  existing: AttendanceRecord | null;
  onSave: (record: AttendanceRecord) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(existing?.status ?? "present");
  const [checkIn, setCheckIn] = useState(existing?.check_in ? fmtTime(existing.check_in).replace(" AM", "").replace(" PM", "") : "09:00");
  const [checkOut, setCheckOut] = useState(existing?.check_out ? fmtTime(existing.check_out) : "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  // Preview mode: build the record locally — no database round-trip.
  const handleSave = () => {
    const record: AttendanceRecord = {
      id: existing?.id ?? uid(),
      employee_id: employee.id,
      date,
      status,
      source: "manual",
      notes: notes || null,
      check_in: (status === "present" || status === "late" || status === "half_day") && checkIn
        ? `${date}T${checkIn.padStart(5, "0")}:00` : null,
      check_out: checkOut ? `${date}T${checkOut.padStart(5, "0")}:00` : null,
    };
    onSave(record);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Mark attendance</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {employee.full_name} · {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Status pills */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Status</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[AttendanceStatus]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all
                    ${status === key ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1 ring-indigo-300` : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time fields */}
          {(status === "present" || status === "late" || status === "half_day") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Check-in time</label>
                <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Check-out time</label>
                <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Work from home, Doctor visit..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-[#1e293b] transition-colors flex items-center justify-center gap-2">
            <Check className="w-3.5 h-3.5" />
            {existing ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Upload Modal ─────────────────────────────────────────────────────────
function CsvUploadModal({ onApply, onClose }: { onApply: (records: AttendanceRecord[]) => void; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const rows = text.trim().split("\n").map(r => r.split(",").map(c => c.trim().replace(/"/g, "")));
      setPreview(rows.slice(0, 6));
    };
    reader.readAsText(f);
  };

  // Preview mode: validates rows against the mock employee list and applies
  // the records in memory — exactly like the real bulk upload, minus the DB.
  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const rows = text.trim().split("\n").map(r => r.split(",").map(c => c.trim().replace(/"/g, "")));
      const headers = rows[0].map(h => h.toLowerCase());
      const errors: string[] = [];
      const records: AttendanceRecord[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3) continue;
        const rowData: Record<string, string> = {};
        headers.forEach((h, j) => { rowData[h] = row[j] || ""; });

        const empCode = rowData["employee_code"] || rowData["code"] || rowData["emp_code"];
        const date = rowData["date"];
        const status = rowData["status"]?.toLowerCase() as AttendanceStatus;

        if (!empCode || !date || !status) { errors.push(`Row ${i + 1}: missing employee_code, date, or status`); continue; }
        if (!STATUS_CONFIG[status]) { errors.push(`Row ${i + 1}: invalid status "${status}"`); continue; }

        const emp = MOCK_EMPLOYEES.find(m => m.employee_code === empCode);
        if (!emp) { errors.push(`Row ${i + 1}: employee "${empCode}" not found`); continue; }

        records.push({
          id: uid(),
          employee_id: emp.id,
          date,
          status,
          source: "manual",
          check_in: rowData["check_in"] ? `${date}T${rowData["check_in"]}:00` : null,
          check_out: rowData["check_out"] ? `${date}T${rowData["check_out"]}:00` : null,
          notes: rowData["notes"] || null,
        });
      }

      setResult({ success: records.length, errors });
      setUploading(false);
      if (records.length > 0) onApply(records);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = "employee_code,date,status,check_in,check_out,notes\nNWL001,2026-06-01,present,09:00,18:00,\nNWL002,2026-06-01,absent,,,Sick";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "attendance_template.csv"; a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Bulk upload attendance</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-700">Download CSV template</p>
              <p className="text-xs text-gray-400">Columns: employee_code, date, status, check_in, check_out, notes</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" />Template
            </button>
          </div>

          {/* File drop */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
          >
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">{file ? file.name : "Click or drag CSV file here"}</p>
            <p className="text-xs text-gray-400 mt-1">Supported: .csv</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>{preview[0].map((h, i) => <th key={i} className="px-3 py-2 text-left text-gray-500 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {row.map((cell, j) => <td key={j} className="px-3 py-1.5 text-gray-600">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-3 rounded-xl border ${result.errors.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <p className="text-xs font-semibold text-gray-700 mb-1">{result.success} rows uploaded successfully</p>
              {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={handleUpload} disabled={!file || uploading}
            className="flex-1 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-[#1e293b] disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading...</> : <><Upload className="w-3.5 h-3.5" />Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Daily View ───────────────────────────────────────────────────────────────
function DailyView({
  employees,
  attendanceMap,
  todayStr,
  onMark,
}: {
  employees: Employee[];
  attendanceMap: AttendanceMap;
  todayStr: string;
  onMark: (emp: Employee, date: string) => void;
}) {
  const present  = employees.filter(e => attendanceMap[`${e.id}_${todayStr}`]?.status === "present");
  const late     = employees.filter(e => attendanceMap[`${e.id}_${todayStr}`]?.status === "late");
  const halfDay  = employees.filter(e => attendanceMap[`${e.id}_${todayStr}`]?.status === "half_day");
  const absent   = employees.filter(e => attendanceMap[`${e.id}_${todayStr}`]?.status === "absent");
  const unmarked = employees.filter(e => !attendanceMap[`${e.id}_${todayStr}`]);

  const groups = [
    { label: "Present", emps: present, cfg: STATUS_CONFIG.present },
    { label: "Late",    emps: late,    cfg: STATUS_CONFIG.late },
    { label: "Half day",emps: halfDay, cfg: STATUS_CONFIG.half_day },
    { label: "Absent",  emps: absent,  cfg: STATUS_CONFIG.absent },
    { label: "Not marked yet", emps: unmarked, cfg: { bg:"bg-gray-50", text:"text-gray-500", border:"border-gray-200", dot:"bg-gray-300", label:"", short:"" } },
  ].filter(g => g.emps.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Today summary bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
          <p className="text-sm font-semibold text-gray-800">
            {new Date(todayStr).toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label:"Present",  count:present.length,  tc:"text-emerald-700", bc:"bg-emerald-100" },
            { label:"Late",     count:late.length,     tc:"text-orange-700",  bc:"bg-orange-100"  },
            { label:"Half day", count:halfDay.length,  tc:"text-amber-700",   bc:"bg-amber-100"   },
            { label:"Absent",   count:absent.length,   tc:"text-red-600",     bc:"bg-red-100"     },
            { label:"Unmarked", count:unmarked.length, tc:"text-gray-600",    bc:"bg-gray-100"    },
          ].map(s => (
            <div key={s.label} className={`px-3 py-1.5 rounded-lg ${s.bc} flex items-center gap-1.5`}>
              <span className={`text-base font-bold ${s.tc}`}>{s.count}</span>
              <span className={`text-xs ${s.tc}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Employee roster by group */}
      {groups.map(group => (
        <div key={group.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className={`px-4 py-2.5 border-b ${group.cfg.bg} ${group.cfg.border} flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full ${group.cfg.dot}`}/>
            <span className={`text-xs font-semibold ${group.cfg.text}`}>{group.label}</span>
            <span className={`ml-auto text-xs font-bold ${group.cfg.text}`}>{group.emps.length}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {group.emps.map(emp => {
              const rec = attendanceMap[`${emp.id}_${todayStr}`];
              return (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(emp.full_name)}`}>
                    {getInitials(emp.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                    <p className="text-xs text-gray-400">{emp.department || emp.employee_code || ""}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {rec?.check_in && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-500"/>In: {fmtTime(rec.check_in)}
                      </span>
                    )}
                    {rec?.check_out && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400"/>Out: {fmtTime(rec.check_out)}
                      </span>
                    )}
                    {rec?.source === "whatsapp" && (
                      <span className="px-1.5 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded text-xs font-medium">WA</span>
                    )}
                    {rec?.notes && <span className="text-gray-400 italic truncate max-w-[120px]">{rec.notes}</span>}
                  </div>
                  <button
                    onClick={() => onMark(emp, todayStr)}
                    className="ml-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
                  >
                    <Edit2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Weekly View ──────────────────────────────────────────────────────────────
function WeeklyView({
  employees,
  attendanceMap,
  todayStr,
  onMark,
}: {
  employees: Employee[];
  attendanceMap: AttendanceMap;
  todayStr: string;
  onMark: (emp: Employee, date: string) => void;
}) {
  // Get current week Mon–Sun
  const getWeekDays = () => {
    const today = new Date(todayStr);
    const dow = (today.getDay() + 6) % 7; // Mon=0
    const mon = new Date(today);
    mon.setDate(today.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();

  const calcHours = (rec: AttendanceRecord | undefined): string => {
    if (!rec?.check_in || !rec?.check_out) return "—";
    const mins = (new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()) / 60000;
    if (mins <= 0) return "—";
    return `${Math.floor(mins / 60)}h ${String(Math.round(mins % 60)).padStart(2,"0")}m`;
  };

  const weekTotal = (emp: Employee): string => {
    let total = 0;
    weekDays.forEach(d => {
      const rec = attendanceMap[`${emp.id}_${isoDate(d)}`];
      if (rec?.check_in && rec?.check_out) {
        total += new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime();
      }
    });
    if (total === 0) return "—";
    const mins = total / 60000;
    return `${Math.floor(mins / 60)}h ${String(Math.round(mins % 60)).padStart(2,"0")}m`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">
          Week of {weekDays[0].toLocaleDateString("en-IN",{day:"numeric",month:"short"})} – {weekDays[6].toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: "700px" }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 bg-gray-50 text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-44 border-r border-gray-200">Employee</th>
              {weekDays.map(d => {
                const ds = isoDate(d);
                const isToday = ds === todayStr;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <th key={ds} className={`text-center text-xs font-medium py-2.5 px-2
                    ${isToday ? "bg-indigo-50 text-indigo-700" : isWeekend ? "bg-gray-50/50 text-gray-400" : "text-gray-600"}`}>
                    <div>{DAYS[(d.getDay()+6)%7]}</div>
                    <div className={`text-sm font-bold mt-0.5 ${isToday ? "w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto" : ""}`}>
                      {d.getDate()}
                    </div>
                  </th>
                );
              })}
              <th className="text-center text-xs font-semibold text-gray-500 px-3 py-2.5 border-l border-gray-200">Total hrs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="sticky left-0 bg-white border-r border-gray-100 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(emp.full_name)}`}>
                      {getInitials(emp.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate max-w-[90px]">{emp.full_name}</p>
                      <p className="text-xs text-gray-400">{emp.employee_code || ""}</p>
                    </div>
                  </div>
                </td>
                {weekDays.map(d => {
                  const ds = isoDate(d);
                  const rec = attendanceMap[`${emp.id}_${ds}`];
                  const isFuture = ds > todayStr;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday = ds === todayStr;
                  const cfg = rec ? STATUS_CONFIG[rec.status] : null;
                  return (
                    <td key={ds} className={`px-1 py-1.5 text-center ${isToday ? "bg-indigo-50/30" : ""}`}>
                      <button
                        onClick={() => !isFuture && onMark(emp, ds)}
                        disabled={isFuture}
                        className={`w-full rounded-lg px-1 py-2 flex flex-col items-center gap-0.5 transition-all
                          ${isFuture ? "opacity-30 cursor-default" : "hover:opacity-80 cursor-pointer"}
                          ${cfg ? `${cfg.bg} ${cfg.border} border` : isWeekend ? "bg-gray-50 border border-gray-100" : "border border-dashed border-gray-200 hover:border-indigo-300"}`}
                      >
                        {cfg
                          ? <>
                              <span className={`text-xs font-bold ${cfg.text}`}>{cfg.short}</span>
                              <span className="text-xs text-gray-500">{calcHours(rec)}</span>
                            </>
                          : <span className="text-xs text-gray-300">{isWeekend ? "—" : "+"}</span>
                        }
                      </button>
                    </td>
                  );
                })}
                <td className="px-3 py-2 border-l border-gray-100 text-center">
                  <span className="text-xs font-semibold text-indigo-600">{weekTotal(emp)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Employee Detail View ─────────────────────────────────────────────────────
function EmployeeDetailView({
  employees,
  attendanceMap,
  days,
  todayStr,
  monthLabel,
  onMark,
}: {
  employees: Employee[];
  attendanceMap: AttendanceMap;
  days: Date[];
  todayStr: string;
  monthLabel: string;
  onMark: (emp: Employee, date: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(employees[0]?.id ?? "");
  const emp = employees.find(e => e.id === selectedId);

  const records = useMemo(() => {
    if (!emp) return [];
    return days.map(d => ({
      date: d,
      dateStr: isoDate(d),
      rec: attendanceMap[`${emp.id}_${isoDate(d)}`] ?? null,
    }));
  }, [emp, days, attendanceMap]);

  const workDays = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6 && isoDate(d) <= todayStr).length;
  const presentDays  = records.filter(r => r.rec?.status === "present" || r.rec?.status === "late").length;
  const absentDays   = records.filter(r => r.rec?.status === "absent").length;
  const halfDays     = records.filter(r => r.rec?.status === "half_day").length;
  const attendancePct = workDays > 0 ? Math.round((presentDays / workDays) * 100) : 0;

  const totalMins = records.reduce((acc, r) => {
    if (r.rec?.check_in && r.rec?.check_out) {
      return acc + (new Date(r.rec.check_out).getTime() - new Date(r.rec.check_in).getTime()) / 60000;
    }
    return acc;
  }, 0);
  const totalHrs = totalMins > 0 ? `${Math.floor(totalMins/60)}h ${String(Math.round(totalMins%60)).padStart(2,"0")}m` : "—";

  if (!emp) return <div className="text-sm text-gray-400 text-center py-20">No employees found</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Employee selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs font-semibold text-gray-500">Select employee:</p>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} {e.employee_code ? `(${e.employee_code})` : ""}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label:"Attendance %", value:`${attendancePct}%`, color: attendancePct >= 85 ? "text-emerald-700" : attendancePct >= 70 ? "text-amber-700" : "text-red-600", bg: attendancePct >= 85 ? "bg-emerald-50" : attendancePct >= 70 ? "bg-amber-50" : "bg-red-50" },
          { label:"Present days",  value:presentDays,  color:"text-emerald-700", bg:"bg-emerald-50" },
          { label:"Absent days",   value:absentDays,   color:"text-red-600",     bg:"bg-red-50" },
          { label:"Half days",     value:halfDays,     color:"text-amber-700",   bg:"bg-amber-50" },
          { label:"Total hrs worked", value:totalHrs,  color:"text-indigo-700",  bg:"bg-indigo-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-white`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Day-by-day table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">{emp.full_name} — {monthLabel}</p>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {records.filter(r => isoDate(r.date) <= todayStr).reverse().map(({ date, dateStr, rec }) => {
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const cfg = rec ? STATUS_CONFIG[rec.status] : null;
            return (
              <div key={dateStr} className={`flex items-center px-5 py-2.5 hover:bg-gray-50 transition-colors ${isWeekend ? "opacity-60" : ""}`}>
                <div className="w-28 flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-700">
                    {date.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
                  </p>
                  {isWeekend && <p className="text-xs text-gray-400">Weekend</p>}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  {cfg
                    ? <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>{cfg.label}</span>
                    : <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">Not marked</span>
                  }
                  {rec?.check_in && <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/>In: {fmtTime(rec.check_in)}</span>}
                  {rec?.check_out && <span className="text-xs text-gray-500">Out: {fmtTime(rec.check_out)}</span>}
                  {rec?.check_in && rec?.check_out && (
                    <span className="text-xs text-indigo-600 font-medium">
                      {(() => { const m = (new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime())/60000; return m > 0 ? `${Math.floor(m/60)}h ${String(Math.round(m%60)).padStart(2,"0")}m` : ""; })()}
                    </span>
                  )}
                  {rec?.source === "whatsapp" && <span className="px-1.5 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded text-xs">WhatsApp</span>}
                  {rec?.notes && <span className="text-xs text-gray-400 italic">{rec.notes}</span>}
                </div>
                <button onClick={() => !isWeekend && onMark(emp, dateStr)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-indigo-600">
                  <Edit2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Department Summary View ──────────────────────────────────────────────────
function DepartmentSummaryView({
  employees,
  attendanceMap,
  days,
  todayStr,
}: {
  employees: Employee[];
  attendanceMap: AttendanceMap;
  days: Date[];
  todayStr: string;
}) {
  const workDaysPassed = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6 && isoDate(d) <= todayStr).length;

  const depts = useMemo(() => {
    const map: Record<string, Employee[]> = {};
    employees.forEach(e => {
      const dept = e.department || "Unassigned";
      if (!map[dept]) map[dept] = [];
      map[dept].push(e);
    });

    return Object.entries(map).map(([dept, emps]) => {
      const totalPossible = emps.length * workDaysPassed;
      const totalPresent = emps.reduce((acc, emp) => {
        return acc + days.filter(d => {
          const ds = isoDate(d);
          const s = attendanceMap[`${emp.id}_${ds}`]?.status;
          return ds <= todayStr && (s === "present" || s === "late");
        }).length;
      }, 0);
      const totalAbsent = emps.reduce((acc, emp) => {
        return acc + days.filter(d => {
          const ds = isoDate(d);
          return ds <= todayStr && attendanceMap[`${emp.id}_${ds}`]?.status === "absent";
        }).length;
      }, 0);
      const pct = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
      const todayPresent = emps.filter(e => attendanceMap[`${e.id}_${todayStr}`]?.status === "present" || attendanceMap[`${e.id}_${todayStr}`]?.status === "late").length;

      return { dept, emps, totalPresent, totalAbsent, totalPossible, pct, todayPresent };
    }).sort((a, b) => b.pct - a.pct);
  }, [employees, attendanceMap, days, todayStr, workDaysPassed]);

  const overallPct = useMemo(() => {
    const total = depts.reduce((a, d) => a + d.totalPossible, 0);
    const present = depts.reduce((a, d) => a + d.totalPresent, 0);
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [depts]);

  return (
    <div className="flex flex-col gap-4">
      {/* Overall bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Overall company attendance</p>
          <span className={`text-2xl font-bold ${overallPct >= 85 ? "text-emerald-700" : overallPct >= 70 ? "text-amber-700" : "text-red-600"}`}>{overallPct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${overallPct >= 85 ? "bg-emerald-500" : overallPct >= 70 ? "bg-amber-400" : "bg-red-500"}`} style={{width:`${overallPct}%`}}/>
        </div>
        <p className="text-xs text-gray-400 mt-2">{employees.length} employees · {workDaysPassed} working days so far this month</p>
      </div>

      {/* Department cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {depts.map(({ dept, emps, totalPresent, totalAbsent, totalPossible, pct, todayPresent }) => (
          <div key={dept} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{dept}</p>
                <p className="text-xs text-gray-400">{emps.length} employee{emps.length !== 1 ? "s" : ""}</p>
              </div>
              <span className={`text-xl font-bold ${pct >= 85 ? "text-emerald-700" : pct >= 70 ? "text-amber-700" : "text-red-600"}`}>{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all duration-500 ${pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-red-500"}`} style={{width:`${pct}%`}}/>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 text-xs mb-3">
              <span className="text-emerald-700 font-medium">{totalPresent} present</span>
              <span className="text-red-500">{totalAbsent} absent</span>
              <span className="text-gray-400">{totalPossible - totalPresent - totalAbsent} unmarked</span>
            </div>

            {/* Today's status */}
            <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
              <span className="text-xs text-gray-500">Today present</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900">{todayPresent}/{emps.length}</span>
                <div className="flex gap-0.5">
                  {emps.map(e => {
                    const s = attendanceMap[`${e.id}_${todayStr}`]?.status;
                    return <div key={e.id} className={`w-2 h-2 rounded-full ${s === "present" || s === "late" ? "bg-emerald-500" : s === "absent" ? "bg-red-400" : "bg-gray-200"}`} title={e.full_name}/>;
                  })}
                </div>
              </div>
            </div>

            {/* Employee breakdown */}
            <div className="mt-2.5 flex flex-wrap gap-1">
              {emps.map(e => {
                const rec = attendanceMap[`${e.id}_${todayStr}`];
                const cfg = rec ? STATUS_CONFIG[rec.status] : null;
                return (
                  <span key={e.id} className={`px-2 py-0.5 rounded text-xs font-medium border ${cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                    {e.full_name.split(" ")[0]}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePreviewPage() {
  // ── State ───────────────────────────────────────────────────────────────────
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // View switcher
  type ViewMode = "calendar" | "daily" | "weekly" | "employee" | "department";
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  // Modals
  const [markModal, setMarkModal] = useState<{ employee: Employee; date: string } | null>(null);
  const [csvModal, setCsvModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Days in month ───────────────────────────────────────────────────────────
  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const monthLabel = useMemo(() =>
    new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    [year, month]);

  const todayStr = isoDate(today);

  // ── Load mock data (replaces the Supabase fetch) ────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 350)); // simulate network
    setEmployees(MOCK_EMPLOYEES);
    setAttendanceMap(generateMockAttendance(year, month, todayStr));
    setLoading(false);
  }, [year, month, todayStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  // ── Mark attendance callback ─────────────────────────────────────────────────
  const handleSaved = (record: AttendanceRecord) => {
    setAttendanceMap(prev => ({ ...prev, [`${record.employee_id}_${record.date}`]: record }));
    setMarkModal(null);
    setToast({ message: "Attendance saved", type: "success" });
  };

  // ── Mark all present for today (in-memory) ───────────────────────────────────
  const markAllPresent = () => {
    if (month !== today.getMonth() || year !== today.getFullYear()) {
      setToast({ message: "Can only mark all-present for the current month's today", type: "error" });
      return;
    }
    const unmarked = employees.filter(e => !attendanceMap[`${e.id}_${todayStr}`]);
    if (unmarked.length === 0) { setToast({ message: "All employees already marked for today", type: "error" }); return; }

    setAttendanceMap(prev => {
      const next = { ...prev };
      unmarked.forEach(e => {
        next[`${e.id}_${todayStr}`] = {
          id: uid(), employee_id: e.id, date: todayStr,
          status: "present", source: "manual",
          check_in: `${todayStr}T09:00:00`, check_out: null, notes: null,
        };
      });
      return next;
    });
    setToast({ message: `${unmarked.length} employees marked present`, type: "success" });
  };

  // ── CSV apply (in-memory) ─────────────────────────────────────────────────────
  const applyCsvRecords = (records: AttendanceRecord[]) => {
    setAttendanceMap(prev => {
      const next = { ...prev };
      records.forEach(r => { next[`${r.employee_id}_${r.date}`] = r; });
      return next;
    });
  };

  // ── Filtered employees ────────────────────────────────────────────────────────
  const filteredEmployees = useMemo(() =>
    employees.filter(e =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) &&
      (!deptFilter || e.department === deptFilter)
    ), [employees, search, deptFilter]);

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const isCurrMonth = month === today.getMonth() && year === today.getFullYear();
  const todayPresent = employees.filter(e => attendanceMap[`${e.id}_${todayStr}`]?.status === "present").length;
  const todayAbsent = employees.filter(e => attendanceMap[`${e.id}_${todayStr}`]?.status === "absent").length;
  const todayUnmarked = employees.filter(e => !attendanceMap[`${e.id}_${todayStr}`]).length;
  const monthWorkDays = days.filter(d => { const dow = d.getDay(); return dow !== 0 && dow !== 6; }).length;
  const totalRecords = Object.values(attendanceMap).filter(r => r.status === "present" || r.status === "late").length;

  const viewTabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key:"calendar",   label:"Monthly",    icon:<Calendar className="w-3.5 h-3.5"/> },
    { key:"daily",      label:"Daily",      icon:<UserCheck className="w-3.5 h-3.5"/> },
    { key:"weekly",     label:"Weekly",     icon:<Clock className="w-3.5 h-3.5"/> },
    { key:"employee",   label:"By employee",icon:<Users className="w-3.5 h-3.5"/> },
    { key:"department", label:"By dept",    icon:<Coffee className="w-3.5 h-3.5"/> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Preview banner ── */}
      <div className="bg-[#0b1220] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/product" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />Product
            </Link>
            <span className="text-gray-600">|</span>
            <span className="font-semibold">Attendance — interactive preview</span>
            <span className="hidden sm:inline text-xs text-gray-400">Sample data · changes aren&rsquo;t saved</span>
          </div>
          <Link href="/signup" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-semibold px-4 py-1.5 rounded-lg">
            Start free <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Attendance</h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Realtime · {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={goToday} className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Today
          </button>
          <button onClick={markAllPresent}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
            <UserCheck className="w-3.5 h-3.5" />Mark all present
          </button>
          <button onClick={() => setCsvModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-3.5 h-3.5" />Bulk upload
          </button>
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── View switcher tabs ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {viewTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${viewMode === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Summary cards ── */}
      {isCurrMonth && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Present today", value: todayPresent, sub: `of ${employees.length} employees`, icon: <UserCheck className="w-4 h-4" />, tc: "text-emerald-600", bc: "bg-emerald-50" },
            { label: "Absent today", value: todayAbsent, sub: "marked absent", icon: <UserX className="w-4 h-4" />, tc: "text-red-500", bc: "bg-red-50" },
            { label: "Unmarked today", value: todayUnmarked, sub: "not yet marked", icon: <Clock className="w-4 h-4" />, tc: "text-amber-600", bc: "bg-amber-50" },
            { label: "Month attendance", value: `${totalRecords}`, sub: `of ${employees.length * monthWorkDays} possible`, icon: <Calendar className="w-4 h-4" />, tc: "text-indigo-600", bc: "bg-indigo-50" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bc} ${s.tc} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 leading-tight">{s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View content ── */}
      {viewMode === "daily" && (
        <DailyView
          employees={filteredEmployees}
          attendanceMap={attendanceMap}
          todayStr={todayStr}
          onMark={(emp, date) => setMarkModal({ employee: emp, date })}
        />
      )}

      {viewMode === "weekly" && (
        <WeeklyView
          employees={filteredEmployees}
          attendanceMap={attendanceMap}
          todayStr={todayStr}
          onMark={(emp, date) => setMarkModal({ employee: emp, date })}
        />
      )}

      {viewMode === "employee" && (
        <EmployeeDetailView
          employees={employees}
          attendanceMap={attendanceMap}
          days={days}
          todayStr={todayStr}
          monthLabel={monthLabel}
          onMark={(emp, date) => setMarkModal({ employee: emp, date })}
        />
      )}

      {viewMode === "department" && (
        <DepartmentSummaryView
          employees={employees}
          attendanceMap={attendanceMap}
          days={days}
          todayStr={todayStr}
        />
      )}

      {viewMode === "calendar" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Month nav + filters */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-bold text-gray-900 min-w-[140px] text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter employee..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white" />
          </div>

          <div className="relative">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="pl-3 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-600">
              <option value="">All departments</option>
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1 text-xs text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${cfg.bg} border ${cfg.border}`} />
                {cfg.label}
              </span>
            ))}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Wifi className="w-3 h-3 text-green-500" />WhatsApp
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            <span className="text-sm text-gray-500">Loading attendance...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Users className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: `${200 + days.length * 40}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {/* Employee column */}
                  <th className="sticky left-0 bg-gray-50 z-10 text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-48 border-r border-gray-200">
                    Employee
                  </th>
                  {/* Day columns */}
                  {days.map(d => {
                    const isToday = isoDate(d) === todayStr;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={isoDate(d)} className={`text-center text-xs font-medium py-2 px-1 w-10
                        ${isToday ? "text-indigo-600 bg-indigo-50" : isWeekend ? "text-gray-400 bg-gray-50/50" : "text-gray-500"}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs opacity-60">{DAYS[(d.getDay() + 6) % 7]}</span>
                          <span className={`text-xs font-bold ${isToday ? "w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center" : ""}`}>
                            {d.getDate()}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  {/* Summary column */}
                  <th className="text-center text-xs font-semibold text-gray-500 px-3 py-2.5 w-20 border-l border-gray-200">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map(emp => {
                  const presentCount = days.filter(d => attendanceMap[`${emp.id}_${isoDate(d)}`]?.status === "present").length;
                  const absentCount = days.filter(d => attendanceMap[`${emp.id}_${isoDate(d)}`]?.status === "absent").length;
                  const workDaysPassed = days.filter(d => {
                    const dow = d.getDay();
                    return dow !== 0 && dow !== 6 && new Date(isoDate(d)) <= today;
                  }).length;

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Employee name — sticky */}
                      <td className="sticky left-0 bg-white z-10 px-4 py-2 border-r border-gray-100 hover:bg-gray-50/50">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(emp.full_name)}`}>
                            {getInitials(emp.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate max-w-[100px]">{emp.full_name}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.employee_code || emp.department || ""}</p>
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
                      {days.map(d => {
                        const dateStr = isoDate(d);
                        const record = attendanceMap[`${emp.id}_${dateStr}`] ?? null;
                        const isFuture = dateStr > todayStr;
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isTodayCell = dateStr === todayStr;

                        return (
                          <td key={dateStr} className={`px-0.5 py-1 ${isTodayCell ? "bg-indigo-50/30" : ""}`}>
                            <StatusCell
                              record={record}
                              isFuture={isFuture}
                              isWeekend={isWeekend}
                              isToday={isTodayCell}
                              onClick={() => !isFuture && setMarkModal({ employee: emp, date: dateStr })}
                            />
                          </td>
                        );
                      })}

                      {/* Summary */}
                      <td className="px-3 py-2 border-l border-gray-100 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-bold text-emerald-700">{presentCount}P</span>
                          <span className="text-xs text-red-500">{absentCount}A</span>
                          {workDaysPassed > 0 && (
                            <span className="text-xs text-gray-400">{Math.round((presentCount / workDaysPassed) * 100)}%</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && filteredEmployees.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{filteredEmployees.length} employees · {days.length} days · Click any cell to mark or edit</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />WhatsApp bot entries shown with green dot
            </span>
          </div>
        )}
      </div>

      )}

      {/* ── Modals ── */}
      {markModal && (
        <MarkModal
          employee={markModal.employee}
          date={markModal.date}
          existing={attendanceMap[`${markModal.employee.id}_${markModal.date}`] ?? null}
          onSave={handleSaved}
          onClose={() => setMarkModal(null)}
        />
      )}
      {csvModal && (
        <CsvUploadModal
          onApply={applyCsvRecords}
          onClose={() => setCsvModal(false)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
      </div>
    </div>
  );
}