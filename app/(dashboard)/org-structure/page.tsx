"use client";
// Route: app/(dashboard)/org-structure/page.tsx
// Org Structure: Departments, Verticals, Locations (full CRUD) + reporting org chart + Leave policies.
// Matches Employees page patterns (drawer/modal + table + toast, indigo/slate tokens, Lucide).
//
// Schema notes (verified against DB):
//  - departments:  id, org_id, name, head_employee_id (FK→employees.id), vertical (text), created_at
//  - verticals:    id, org_id, name, head_employee_id (NO FK), created_at
//  - org_locations:id, org_id, name, type, address, city, state, pincode, is_headquarters, head_employee_id (NO FK),
//                  latitude, longitude, geofence_radius_m, created_at
//  - org chart from employees.reporting_manager_id → employees.id (self-FK, confirmed)
//  - "head" is label-only: stored on the dept/vertical/location, NO write-back to the employee row.

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import LeavePolicies from "@/components/LeavePolicies";
import {
  Building2, Plus, X, Loader2, AlertCircle, CheckCircle2, RefreshCw,
  Trash2, Edit2, Layers, MapPin, Network, Users, Star, ChevronDown,
  Briefcase, Home, Warehouse, Store, Factory, Wifi, ShieldCheck,
} from "lucide-react";

function useSupabase() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmployeeLite {
  id: string; full_name: string; designation: string | null;
  department: string | null; reporting_manager_id: string | null; status: string;
}
interface Department { id: string; org_id: string; name: string; head_employee_id: string | null; vertical: string | null; created_at: string; }
interface Vertical { id: string; org_id: string; name: string; head_employee_id: string | null; created_at: string; }
interface OrgLocation {
  id: string; org_id: string; name: string; type: string;
  address: string | null; city: string | null; state: string | null; pincode: string | null;
  is_headquarters: boolean; head_employee_id: string | null; created_at: string;
  latitude: number | null; longitude: number | null; geofence_radius_m: number | null;
}

type Tab = "departments" | "verticals" | "locations" | "chart" | "policies";

const LOCATION_TYPES = [
  { value: "office", label: "Office", icon: Briefcase },
  { value: "warehouse", label: "Warehouse", icon: Warehouse },
  { value: "store", label: "Store", icon: Store },
  { value: "factory", label: "Factory", icon: Factory },
  { value: "remote", label: "Remote", icon: Wifi },
];
const locTypeMeta = (t: string) => LOCATION_TYPES.find(x => x.value === t) || LOCATION_TYPES[0];

// ── Shared UI ───────────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-colors placeholder:text-gray-300";
const selectCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-colors appearance-none";

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>{children}{hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}</div>;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const colors = ["bg-indigo-100 text-indigo-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700", "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700", "bg-orange-100 text-orange-700"];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 select-none`}>{name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}</div>;
}

// Reusable head-employee picker
function HeadSelect({ value, onChange, employees }: { value: string; onChange: (v: string) => void; employees: EmployeeLite[] }) {
  return (
    <div className="relative">
      <select className={selectCls} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">No head assigned</option>
        {employees.filter(e => e.status === "active").map(e => (
          <option key={e.id} value={e.id}>{e.full_name}{e.designation ? ` — ${e.designation}` : ""}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ── Department Modal ───────────────────────────────────────────────────────────
function DepartmentModal({ orgId, employees, editing, onSaved, onClose }: {
  orgId: string; employees: EmployeeLite[]; editing: Department | null;
  onSaved: (d: Department) => void; onClose: () => void;
}) {
  const sb = useSupabase();
  const [name, setName] = useState(editing?.name || "");
  const [vertical, setVertical] = useState(editing?.vertical || "");
  const [head, setHead] = useState(editing?.head_employee_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Enter a department name"); return; }
    setSaving(true); setError("");
    const payload = { org_id: orgId, name: name.trim(), vertical: vertical.trim() || null, head_employee_id: head || null };
    const q = editing
      ? sb.from("departments").update(payload).eq("id", editing.id).select().single()
      : sb.from("departments").insert(payload).select().single();
    const { data, error: e } = await q;
    if (e) { setError(e.message.includes("duplicate") ? "A department with this name already exists" : e.message); setSaving(false); return; }
    onSaved(data as Department);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-4">{editing ? "Edit department" : "New department"}</h3>
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <input className={`${inputCls} ${error && !name.trim() ? "border-red-300" : ""}`} placeholder="e.g. Engineering" value={name} autoFocus onChange={e => { setName(e.target.value); setError(""); }} />
          </Field>
          <Field label="Vertical" hint="Optional grouping label">
            <input className={inputCls} placeholder="e.g. Product" value={vertical} onChange={e => setVertical(e.target.value)} />
          </Field>
          <Field label="Department head">
            <HeadSelect value={head} onChange={setHead} employees={employees} />
          </Field>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{editing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vertical Modal ──────────────────────────────────────────────────────────────
function VerticalModal({ orgId, employees, editing, onSaved, onClose }: {
  orgId: string; employees: EmployeeLite[]; editing: Vertical | null;
  onSaved: (v: Vertical) => void; onClose: () => void;
}) {
  const sb = useSupabase();
  const [name, setName] = useState(editing?.name || "");
  const [head, setHead] = useState(editing?.head_employee_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Enter a vertical name"); return; }
    setSaving(true); setError("");
    const payload = { org_id: orgId, name: name.trim(), head_employee_id: head || null };
    const q = editing
      ? sb.from("verticals").update(payload).eq("id", editing.id).select().single()
      : sb.from("verticals").insert(payload).select().single();
    const { data, error: e } = await q;
    if (e) { setError(e.message.includes("duplicate") ? "A vertical with this name already exists" : e.message); setSaving(false); return; }
    onSaved(data as Vertical);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-4">{editing ? "Edit vertical" : "New vertical"}</h3>
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <input className={`${inputCls} ${error && !name.trim() ? "border-red-300" : ""}`} placeholder="e.g. Retail" value={name} autoFocus onChange={e => { setName(e.target.value); setError(""); }} />
          </Field>
          <Field label="Vertical head">
            <HeadSelect value={head} onChange={setHead} employees={employees} />
          </Field>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{editing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Location Modal ──────────────────────────────────────────────────────────────
function LocationModal({ orgId, employees, editing, onSaved, onClose }: {
  orgId: string; employees: EmployeeLite[]; editing: OrgLocation | null;
  onSaved: (l: OrgLocation) => void; onClose: () => void;
}) {
  const sb = useSupabase();
  const [form, setForm] = useState({
    name: editing?.name || "", type: editing?.type || "office",
    address: editing?.address || "", city: editing?.city || "", state: editing?.state || "", pincode: editing?.pincode || "",
    is_headquarters: editing?.is_headquarters || false, head_employee_id: editing?.head_employee_id || "",
    latitude: editing?.latitude?.toString() || "", longitude: editing?.longitude?.toString() || "",
    geofence_radius_m: editing?.geofence_radius_m?.toString() || "200",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported in this browser"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      p => { set("latitude", p.coords.latitude.toFixed(6)); set("longitude", p.coords.longitude.toFixed(6)); setLocating(false); },
      () => { setError("Couldn't get your location — check browser permissions"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const save = async () => {
    if (!form.name.trim()) { setError("Enter a location name"); return; }
    setSaving(true); setError("");
    const payload = {
      org_id: orgId, name: form.name.trim(), type: form.type,
      address: form.address.trim() || null, city: form.city.trim() || null,
      state: form.state.trim() || null, pincode: form.pincode.trim() || null,
      is_headquarters: form.is_headquarters, head_employee_id: form.head_employee_id || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      geofence_radius_m: form.geofence_radius_m ? Number(form.geofence_radius_m) : 200,
    };
    const q = editing
      ? sb.from("org_locations").update(payload).eq("id", editing.id).select().single()
      : sb.from("org_locations").insert(payload).select().single();
    const { data, error: e } = await q;
    if (e) { setError(e.message.includes("duplicate") ? "A location with this name already exists" : e.message); setSaving(false); return; }
    onSaved(data as OrgLocation);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-4">{editing ? "Edit location" : "New location"}</h3>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" required>
              <input className={`${inputCls} ${error && !form.name.trim() ? "border-red-300" : ""}`} placeholder="e.g. Corporate Office" value={form.name} autoFocus onChange={e => { set("name", e.target.value); setError(""); }} />
            </Field>
            <Field label="Type">
              <div className="relative">
                <select className={selectCls} value={form.type} onChange={e => set("type", e.target.value)}>
                  {LOCATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </Field>
          </div>
          <Field label="Address">
            <input className={inputCls} placeholder="Street address" value={form.address} onChange={e => set("address", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City"><input className={inputCls} placeholder="City" value={form.city} onChange={e => set("city", e.target.value)} /></Field>
            <Field label="State"><input className={inputCls} placeholder="State" value={form.state} onChange={e => set("state", e.target.value)} /></Field>
            <Field label="Pincode"><input className={inputCls} placeholder="000000" value={form.pincode} onChange={e => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} /></Field>
          </div>
          <Field label="Location head">
            <HeadSelect value={form.head_employee_id} onChange={v => set("head_employee_id", v)} employees={employees} />
          </Field>

          {/* Geo-fencing for attendance check-in */}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Latitude" hint="For geo check-in"><input className={inputCls} placeholder="18.5204" value={form.latitude} onChange={e => set("latitude", e.target.value)} /></Field>
            <Field label="Longitude"><input className={inputCls} placeholder="73.8567" value={form.longitude} onChange={e => set("longitude", e.target.value)} /></Field>
            <Field label="Radius (m)" hint="Geofence"><input className={inputCls} type="number" value={form.geofence_radius_m} onChange={e => set("geofence_radius_m", e.target.value)} /></Field>
          </div>
          <button type="button" onClick={useMyLocation} disabled={locating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 w-fit">
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}Use my current location
          </button>

          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${form.is_headquarters ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200"}`}>
            <input type="checkbox" checked={form.is_headquarters} onChange={e => set("is_headquarters", e.target.checked)} className="accent-indigo-600 w-4 h-4" />
            <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs font-semibold text-gray-800">Headquarters</span></div>
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{editing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Org Chart (from reporting_manager_id) ────────────────────────────────────
interface ChartNode extends EmployeeLite { children: ChartNode[]; }

function buildTree(employees: EmployeeLite[]): { roots: ChartNode[]; orphanCycle: boolean } {
  const active = employees.filter(e => e.status === "active");
  const byId = new Map<string, ChartNode>();
  active.forEach(e => byId.set(e.id, { ...e, children: [] }));
  const roots: ChartNode[] = [];
  byId.forEach(node => {
    const mid = node.reporting_manager_id;
    if (mid && byId.has(mid) && mid !== node.id) {
      byId.get(mid)!.children.push(node);
    } else {
      roots.push(node); // no manager, or manager inactive/missing → top-level
    }
  });
  // Cycle guard: if everyone has a manager but nothing surfaced as root, fall back to flat
  const orphanCycle = roots.length === 0 && active.length > 0;
  if (orphanCycle) return { roots: Array.from(byId.values()), orphanCycle: true };
  return { roots, orphanCycle: false };
}

function ChartCard({ node, depth }: { node: ChartNode; depth: number }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm w-fit min-w-[220px]">
        <Avatar name={node.full_name} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{node.full_name}</p>
          <p className="text-xs text-gray-400 truncate">{node.designation || "—"}{node.department ? ` · ${node.department}` : ""}</p>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="ml-6 mt-2 pl-5 border-l-2 border-gray-200 flex flex-col gap-2">
          {node.children.map(c => <ChartCard key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrgStructurePage() {
  const sb = useSupabase();
  const [tab, setTab] = useState<Tab>("departments");
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [locations, setLocations] = useState<OrgLocation[]>([]);

  const [deptModal, setDeptModal] = useState<{ open: boolean; editing: Department | null }>({ open: false, editing: null });
  const [vertModal, setVertModal] = useState<{ open: boolean; editing: Vertical | null }>({ open: false, editing: null });
  const [locModal, setLocModal] = useState<{ open: boolean; editing: OrgLocation | null }>({ open: false, editing: null });
  const [confirmDel, setConfirmDel] = useState<{ kind: Tab; id: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const empName = useCallback((id: string | null) => id ? (employees.find(e => e.id === id)?.full_name || "—") : "—", [employees]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      let oid = orgId || localStorage.getItem("activeOrgId") || "";
      if (!oid) {
        const email = localStorage.getItem("userEmail");
        if (email) {
          const { data: u } = await sb.from("users").select("org_id").eq("email", email).maybeSingle();
          if (u?.org_id) oid = u.org_id;
        }
      }
      if (!oid) {
        const { data: firstOrg } = await sb.from("organizations").select("id").limit(1).maybeSingle();
        if (firstOrg?.id) oid = firstOrg.id;
      }
      if (!oid) { setLoading(false); return; }
      setOrgId(oid);
      localStorage.setItem("activeOrgId", oid);
      setOrgName(localStorage.getItem("activeOrgName") || "");

      const [{ data: emps }, { data: depts }, { data: verts }, { data: locs }] = await Promise.all([
        sb.from("employees").select("id, full_name, designation, department, reporting_manager_id, status").eq("org_id", oid).or("status.neq.terminated,status.is.null").order("full_name"),
        sb.from("departments").select("*").eq("org_id", oid).order("name"),
        sb.from("verticals").select("*").eq("org_id", oid).order("name"),
        sb.from("org_locations").select("*").eq("org_id", oid).order("is_headquarters", { ascending: false }).order("name"),
      ]);

      setEmployees((emps || []) as EmployeeLite[]);
      setDepartments((depts || []) as Department[]);
      setVerticals((verts || []) as Vertical[]);
      setLocations((locs || []) as OrgLocation[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [sb, orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const doDelete = async () => {
    if (!confirmDel) return;
    const { kind, id } = confirmDel;
    const table = kind === "departments" ? "departments" : kind === "verticals" ? "verticals" : "org_locations";
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) {
      setToast({ message: error.message.includes("foreign key") || error.message.includes("violates")
        ? "Can't delete — employees are still assigned to this. Reassign them first."
        : error.message, type: "error" });
    } else {
      if (kind === "departments") setDepartments(p => p.filter(d => d.id !== id));
      if (kind === "verticals") setVerticals(p => p.filter(v => v.id !== id));
      if (kind === "locations") setLocations(p => p.filter(l => l.id !== id));
      setToast({ message: "Deleted", type: "success" });
    }
    setConfirmDel(null);
  };

  const { roots, orphanCycle } = useMemo(() => buildTree(employees), [employees]);

  const TABS: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "departments", label: "Departments", icon: Layers, count: departments.length },
    { id: "verticals", label: "Verticals", icon: Network, count: verticals.length },
    { id: "locations", label: "Locations", icon: MapPin, count: locations.length },
    { id: "chart", label: "Org chart", icon: Users },
    { id: "policies", label: "Leave policies", icon: ShieldCheck },
  ];

  const addBtn = () => {
    if (tab === "departments") setDeptModal({ open: true, editing: null });
    else if (tab === "verticals") setVertModal({ open: true, editing: null });
    else if (tab === "locations") setLocModal({ open: true, editing: null });
  };

  return (
    <div className="p-6 flex flex-col gap-5 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Org structure</h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3 h-3" />{orgName || "Your organization"} · {departments.length} depts · {verticals.length} verticals · {locations.length} locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
          {tab !== "chart" && tab !== "policies" && (
            <button onClick={addBtn} className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b]">
              <Plus className="w-4 h-4" />New {tab === "departments" ? "department" : tab === "verticals" ? "vertical" : "location"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-4 h-4" />{t.label}
            {t.count !== undefined && <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === t.id ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><span className="text-sm text-gray-500">Loading…</span></div>
      ) : (
        <>
          {/* DEPARTMENTS */}
          {tab === "departments" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {departments.length === 0 ? (
                <EmptyState icon={Layers} title="No departments yet" cta="Create department" onCta={() => setDeptModal({ open: true, editing: null })} />
              ) : (
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-200">{["Department", "Vertical", "Head", ""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {departments.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Layers className="w-4 h-4" /></div><span className="text-sm font-semibold text-gray-900">{d.name}</span></div></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{d.vertical || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{empName(d.head_employee_id)}</td>
                        <td className="px-4 py-3"><RowActions onEdit={() => setDeptModal({ open: true, editing: d })} confirming={confirmDel?.kind === "departments" && confirmDel.id === d.id} onAskDelete={() => setConfirmDel({ kind: "departments", id: d.id })} onCancelDelete={() => setConfirmDel(null)} onConfirmDelete={doDelete} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* VERTICALS */}
          {tab === "verticals" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {verticals.length === 0 ? (
                <EmptyState icon={Network} title="No verticals yet" cta="Create vertical" onCta={() => setVertModal({ open: true, editing: null })} />
              ) : (
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-200">{["Vertical", "Head", ""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {verticals.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Network className="w-4 h-4" /></div><span className="text-sm font-semibold text-gray-900">{v.name}</span></div></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{empName(v.head_employee_id)}</td>
                        <td className="px-4 py-3"><RowActions onEdit={() => setVertModal({ open: true, editing: v })} confirming={confirmDel?.kind === "verticals" && confirmDel.id === v.id} onAskDelete={() => setConfirmDel({ kind: "verticals", id: v.id })} onCancelDelete={() => setConfirmDel(null)} onConfirmDelete={doDelete} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* LOCATIONS */}
          {tab === "locations" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {locations.length === 0 ? (
                <EmptyState icon={MapPin} title="No locations yet" cta="Create location" onCta={() => setLocModal({ open: true, editing: null })} />
              ) : (
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-200">{["Location", "Type", "City", "Geo", "Head", ""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {locations.map(l => {
                      const meta = locTypeMeta(l.type); const Icon = meta.icon;
                      return (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Icon className="w-4 h-4" /></div><div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-900">{l.name}</span>{l.is_headquarters && <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 flex items-center gap-1"><Star className="w-3 h-3" />HQ</span>}</div></div></td>
                          <td className="px-4 py-3 text-sm text-gray-500">{meta.label}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{l.city || "—"}</td>
                          <td className="px-4 py-3 text-sm">{l.latitude != null && l.longitude != null ? <span className="text-emerald-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{l.geofence_radius_m ?? 200}m</span> : <span className="text-gray-300">Not set</span>}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{empName(l.head_employee_id)}</td>
                          <td className="px-4 py-3"><RowActions onEdit={() => setLocModal({ open: true, editing: l })} confirming={confirmDel?.kind === "locations" && confirmDel.id === l.id} onAskDelete={() => setConfirmDel({ kind: "locations", id: l.id })} onCancelDelete={() => setConfirmDel(null)} onConfirmDelete={doDelete} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ORG CHART */}
          {tab === "chart" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {employees.filter(e => e.status === "active").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><Users className="w-5 h-5 text-gray-400" /></div>
                  <p className="text-sm font-semibold text-gray-600">No active employees to chart</p>
                </div>
              ) : (
                <>
                  {orphanCycle && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />Reporting lines form a loop, so no clear top. Showing everyone flat — fix a manager assignment on the Employees page to build the tree.
                    </div>
                  )}
                  <div className="flex flex-col gap-3 overflow-x-auto">
                    {roots.map(r => <ChartCard key={r.id} node={r} depth={0} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* LEAVE POLICIES */}
          {tab === "policies" && (
            <LeavePolicies orgId={orgId} onToast={(message, type) => setToast({ message, type })} />
          )}
        </>
      )}

      {/* Modals */}
      {deptModal.open && <DepartmentModal orgId={orgId} employees={employees} editing={deptModal.editing}
        onClose={() => setDeptModal({ open: false, editing: null })}
        onSaved={d => { setDepartments(p => deptModal.editing ? p.map(x => x.id === d.id ? d : x) : [...p, d].sort((a, b) => a.name.localeCompare(b.name))); setDeptModal({ open: false, editing: null }); setToast({ message: deptModal.editing ? "Department updated" : `Department "${d.name}" created`, type: "success" }); }} />}
      {vertModal.open && <VerticalModal orgId={orgId} employees={employees} editing={vertModal.editing}
        onClose={() => setVertModal({ open: false, editing: null })}
        onSaved={v => { setVerticals(p => vertModal.editing ? p.map(x => x.id === v.id ? v : x) : [...p, v].sort((a, b) => a.name.localeCompare(b.name))); setVertModal({ open: false, editing: null }); setToast({ message: vertModal.editing ? "Vertical updated" : `Vertical "${v.name}" created`, type: "success" }); }} />}
      {locModal.open && <LocationModal orgId={orgId} employees={employees} editing={locModal.editing}
        onClose={() => setLocModal({ open: false, editing: null })}
        onSaved={l => { setLocations(p => locModal.editing ? p.map(x => x.id === l.id ? l : x) : [...p, l]); setLocModal({ open: false, editing: null }); setToast({ message: locModal.editing ? "Location updated" : `Location "${l.name}" created`, type: "success" }); fetchAll(); }} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, cta, onCta }: { icon: any; title: string; cta: string; onCta: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><Icon className="w-5 h-5 text-gray-400" /></div>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      <button onClick={onCta} className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg"><Plus className="w-4 h-4" />{cta}</button>
    </div>
  );
}

function RowActions({ onEdit, confirming, onAskDelete, onCancelDelete, onConfirmDelete }: {
  onEdit: () => void; confirming: boolean; onAskDelete: () => void; onCancelDelete: () => void; onConfirmDelete: () => void;
}) {
  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <button onClick={onConfirmDelete} className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
        <button onClick={onCancelDelete} className="px-2.5 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 justify-end">
      <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
      <button onClick={onAskDelete} className="p-1.5 hover:bg-red-50 rounded-lg group" title="Delete"><Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" /></button>
    </div>
  );
}