"use client";
// Route: app/(dashboard)/my-attendance/page.tsx
// Employee self-service attendance: check-in / check-out with geo capture + flagging,
// 14-day personal history, and a "Request regularisation" approval flow.
// This is the EMPLOYEE surface. The admin console lives at /attendance (separate, untouched).

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  MapPin, AlertTriangle, CheckCircle2, Loader2, LogIn, LogOut,
  RefreshCw, Navigation, ShieldAlert, Wifi, X, FileClock, Clock,
} from "lucide-react";
import { captureAndEvaluate, type OfficeLoc, type GeoResult } from "@/lib/geo";

function useSB() {
  return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
}

interface SessionUser { id: string; email: string; full_name: string | null; role: string | null; org_id: string | null; }
interface EmpRow { id: string; full_name: string | null; email: string | null; department: string | null; designation: string | null; reporting_manager_id?: string | null; }
interface AttRow {
  id: string; employee_id: string; date: string; check_in: string | null; check_out: string | null;
  status: string; source: string | null; latitude: number | null; longitude: number | null;
  geo_flagged: boolean | null; distance_m: number | null;
}

const fmtTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "-";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const todayISO = () => new Date().toISOString().split("T")[0];

const STATUS_BADGE: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700", late: "bg-amber-100 text-amber-700",
  wfh: "bg-blue-100 text-blue-700", half_day: "bg-violet-100 text-violet-700",
  absent: "bg-red-100 text-red-600", weekend: "bg-gray-100 text-gray-500",
};

function GeoBanner({ result, onClose }: { result: GeoResult; onClose: () => void }) {
  if (result.denied) return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
      <ShieldAlert className="w-4 h-4 flex-shrink-0" />Location permission denied - punch recorded without coordinates.
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
  if (!result.coords) return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
      <Wifi className="w-4 h-4 flex-shrink-0" />Couldn't get location - punch recorded without coordinates.
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
  if (result.geo_flagged) return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />Punched {result.distance_m}m from {result.nearest?.name || "office"} - outside the {result.nearest?.geofence_radius_m ?? 200}m zone. Recorded and flagged.
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
      <Navigation className="w-4 h-4 flex-shrink-0" />Location verified{result.nearest ? ` - ${result.distance_m}m from ${result.nearest.name}` : ""}.
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function RegulariseModal({ user, emp, prefillDate, onClose, onDone }: {
  user: SessionUser; emp: EmpRow; prefillDate?: string;
  onClose: () => void; onDone: (msg: string, ok: boolean) => void;
}) {
  const sb = useSB();
  const [date, setDate] = useState(prefillDate || todayISO());
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!date) { setErr("Pick a date"); return; }
    if (!reason.trim()) { setErr("A reason is required for regularisation"); return; }
    setSaving(true); setErr("");
    try {
      const orgId = user.org_id || "";
      let approverUserId = "", approverName = "";
      if (emp.reporting_manager_id) {
        const { data: mgr } = await sb.from("employees").select("full_name, email").eq("id", emp.reporting_manager_id).maybeSingle();
        if (mgr?.email) {
          const { data: mgrUser } = await sb.from("users").select("id").eq("email", mgr.email).eq("org_id", orgId).maybeSingle();
          if (mgrUser) { approverUserId = mgrUser.id; approverName = mgr.full_name || ""; }
        }
      }
      if (!approverUserId) {
        const { data: admins } = await sb.from("users").select("id, full_name").eq("org_id", orgId).in("role", ["manager", "hr", "admin", "owner"]).limit(1);
        if (admins?.length) { approverUserId = admins[0].id; approverName = admins[0].full_name || "Admin"; }
      }
      if (!approverUserId) { setErr("No approver found for your org"); setSaving(false); return; }

      const checkInISO = inTime ? new Date(`${date}T${inTime}:00`).toISOString() : null;
      const checkOutISO = outTime ? new Date(`${date}T${outTime}:00`).toISOString() : null;
      const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data: req, error } = await sb.from("approval_requests").insert({
        org_id: orgId, type: "attendance_regularisation",
        title: `Attendance regularisation - ${fmtDate(date)}`,
        description: reason.trim(),
        raised_by: user.id, raised_by_name: emp.full_name || user.full_name || user.email,
        assigned_to: approverUserId, assigned_to_name: approverName,
        status: "pending", escalation_level: 0, tat_hours: 24, deadline_at: deadline,
        payload: { employee_id: emp.id, date, check_in: checkInISO, check_out: checkOutISO, reason: reason.trim() },
      }).select().maybeSingle();
      if (error) { setErr(error.message); setSaving(false); return; }

      if (req) {
        await sb.from("notifications").insert({
          org_id: orgId, user_id: approverUserId, title: "Attendance regularisation",
          body: `${emp.full_name || "An employee"} requested regularisation for ${fmtDate(date)}`,
          type: "approval", reference_type: "approval_request", reference_id: req.id, link: "/approvals",
        });
        await sb.from("approval_history").insert({
          request_id: req.id, action: "submitted", acted_by: user.id,
          acted_by_name: emp.full_name || user.email, notes: "Regularisation requested", from_status: null, to_status: "pending",
        });
        try { await fetch("/api/approvals/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: req.id, event: "applied" }) }); } catch {}
      }
      onDone("Regularisation request submitted", true);
    } catch (e: any) { setErr(e.message || "Failed"); setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div><h2 className="text-base font-bold text-gray-900">Request regularisation</h2><p className="text-xs text-gray-400">Correct a missed or wrong punch - needs approval</p></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {err && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{err}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
            <input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Correct check-in</label><input type="time" value={inTime} onChange={e => setInTime(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Correct check-out</label><input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} className={inputCls} /></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="e.g. Forgot to check in, was at client site" className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileClock className="w-4 h-4" />}Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyAttendancePage() {
  const sb = useSB();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [emp, setEmp] = useState<EmpRow | null>(null);
  const [offices, setOffices] = useState<OfficeLoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [regularise, setRegularise] = useState<{ open: boolean; date?: string }>({ open: false });

  const [today, setToday] = useState<AttRow | null>(null);
  const [history, setHistory] = useState<AttRow[]>([]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let u: SessionUser | null = null;
      const email = localStorage.getItem("userEmail");
      if (email) {
        const { data } = await sb.from("users").select("id, email, full_name, role, org_id").eq("email", email.toLowerCase().trim()).maybeSingle();
        if (data) u = data as SessionUser;
      }
      if (!u) { setLoading(false); return; }
      setUser(u);
      const orgId = u.org_id || localStorage.getItem("activeOrgId") || "";

      const { data: locs } = await sb.from("org_locations").select("id, name, latitude, longitude, geofence_radius_m").eq("org_id", orgId);
      setOffices((locs || []) as OfficeLoc[]);

      const { data: empRow } = await sb.from("employees")
        .select("id, full_name, email, department, designation, reporting_manager_id").eq("email", u.email).maybeSingle();
      if (empRow) setEmp(empRow as EmpRow);

      if (empRow?.id) {
        const { data: t } = await sb.from("attendance").select("*").eq("employee_id", empRow.id).eq("date", todayISO()).maybeSingle();
        setToday((t as AttRow) || null);
        const { data: hist } = await sb.from("attendance").select("*").eq("employee_id", empRow.id).order("date", { ascending: false }).limit(14);
        setHistory((hist || []) as AttRow[]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [sb]);

  useEffect(() => { load(); }, [load]);

  const checkIn = async () => {
    if (!emp || !user) return;
    setPunching(true);
    const geo = await captureAndEvaluate(offices);
    setGeoResult(geo);
    const { error } = await sb.from("attendance").insert({
      employee_id: emp.id, org_id: user.org_id, date: todayISO(),
      check_in: new Date().toISOString(), status: "present", source: "web",
      latitude: geo.coords?.latitude ?? null, longitude: geo.coords?.longitude ?? null,
      geo_flagged: geo.geo_flagged, distance_m: geo.distance_m,
    });
    if (!error) await load();
    setPunching(false);
  };

  const checkOut = async () => {
    if (!today || !emp) return;
    setPunching(true);
    const geo = await captureAndEvaluate(offices);
    setGeoResult(geo);
    const { error } = await sb.from("attendance").update({
      check_out: new Date().toISOString(),
      check_out_latitude: geo.coords?.latitude ?? null,
      check_out_longitude: geo.coords?.longitude ?? null,
    }).eq("id", today.id);
    if (!error) await load();
    setPunching(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><span className="text-sm text-gray-500">Loading...</span></div>
  );

  if (!emp) return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-600">No employee record linked to your account</p>
        <p className="text-xs text-gray-400 mt-1">Attendance is available once your profile is set up by HR.</p>
      </div>
    </div>
  );

  const checkedIn = !!today?.check_in;
  const checkedOut = !!today?.check_out;

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">My attendance</h1>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-sm">Today</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => setRegularise({ open: true })} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"><FileClock className="w-3.5 h-3.5" />Request regularisation</button>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Live</span>
          </div>
        </div>

        {geoResult && <div className="mb-4"><GeoBanner result={geoResult} onClose={() => setGeoResult(null)} /></div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`rounded-xl border p-4 ${checkedIn ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-2"><LogIn className="w-4 h-4 text-emerald-600" /><span className="text-xs font-semibold text-gray-700">Check in</span></div>
            {checkedIn ? (
              <>
                <p className="text-lg font-bold text-gray-900">{fmtTime(today!.check_in)}</p>
                {today!.geo_flagged && <p className="text-xs text-orange-600 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" />{today!.distance_m}m from office</p>}
              </>
            ) : (
              <button onClick={checkIn} disabled={punching} className="mt-1 w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {punching ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}Check in now
              </button>
            )}
          </div>
          <div className={`rounded-xl border p-4 ${checkedOut ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-2"><LogOut className="w-4 h-4 text-indigo-600" /><span className="text-xs font-semibold text-gray-700">Check out</span></div>
            {checkedOut ? (
              <p className="text-lg font-bold text-gray-900">{fmtTime(today!.check_out)}</p>
            ) : (
              <button onClick={checkOut} disabled={!checkedIn || punching} className="mt-1 w-full py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm rounded-lg hover:from-indigo-600 hover:to-violet-600 disabled:opacity-40 flex items-center justify-center gap-2">
                {punching ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}{checkedIn ? "Check out" : "Check in first"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <p className="text-sm font-bold text-gray-900 mb-4">Last 14 days</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="text-left">{["Date", "In", "Out", "Status", "Location", ""].map(h => <th key={h} className="text-xs font-semibold text-gray-400 pb-2 pr-4">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {history.length === 0 && <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-6">No attendance records yet</td></tr>}
              {history.map(r => (
                <tr key={r.id} className="text-sm">
                  <td className="py-2.5 pr-4 text-gray-700 font-medium">{fmtDate(r.date)}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{fmtTime(r.check_in)}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{fmtTime(r.check_out)}</td>
                  <td className="py-2.5 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-500"}`}>{r.status}</span></td>
                  <td className="py-2.5 pr-4">
                    {r.geo_flagged ? <span className="text-xs text-orange-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{r.distance_m}m off</span>
                      : r.latitude != null ? <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Verified</span>
                      : <span className="text-xs text-gray-400">No GPS</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <button onClick={() => setRegularise({ open: true, date: r.date })} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Fix</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {regularise.open && emp && user && (
        <RegulariseModal user={user} emp={emp} prefillDate={regularise.date}
          onClose={() => setRegularise({ open: false })}
          onDone={(msg, ok) => { setRegularise({ open: false }); setToast({ msg, ok }); if (ok) load(); }} />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}
          <button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5 opacity-50" /></button>
        </div>
      )}
    </div>
  );
}
