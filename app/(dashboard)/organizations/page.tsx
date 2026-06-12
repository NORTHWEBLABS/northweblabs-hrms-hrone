"use client";
// Route: app/(dashboard)/organizations/page.tsx
// Super Admin — Create & manage organizations
// Creates org + owner user + sends invite email

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Building2, Plus, Search, X, Loader2, CheckCircle2, AlertCircle,
  Users, Mail, Phone, Globe, MapPin, ChevronDown, ExternalLink,
  Send, RefreshCw, Crown, ArrowRight,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

const INDUSTRIES = ["Manufacturing","Retail","Finance","Technology","Healthcare","Education","Hospitality","Real Estate","Logistics","Media","Legal","Agriculture","NGO","Other"];
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];

interface Org {
  id: string; name: string; legal_name: string | null; brand_name: string | null;
  owner_email: string | null; owner_name: string | null;
  industry: string | null; state: string | null; city: string | null;
  plan: string; plan_status: string; email: string | null; phone: string | null;
  employee_count: number; created_at: string;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ══════════════════════════════════════════════════════════════════════════════
//  CREATE ORG MODAL
// ══════════════════════════════════════════════════════════════════════════════
function CreateOrgModal({ onSave, onClose }: { onSave: (org: Org) => void; onClose: () => void }) {
  const sb = useSB();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Org fields
  const [brandName, setBrandName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [industry, setIndustry] = useState("Manufacturing");
  const [state, setState] = useState("Maharashtra");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  // Owner fields
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [pan, setPan] = useState("");

  const save = async () => {
    setError("");
    if (!brandName.trim()) { setError("Brand name is required"); return; }
    if (!ownerEmail.trim() || !/\S+@\S+\.\S+/.test(ownerEmail)) { setError("Valid owner email is required"); return; }
    if (!ownerName.trim()) { setError("Owner name is required"); return; }

    setSaving(true);
    try {
      // Check PAN uniqueness if provided
      if (gstin) {
        const pan = gstin.slice(2, 12); // Extract PAN from GSTIN
        const { data: existing } = await sb.from("organizations").select("id, name").eq("pan", pan).maybeSingle();
        if (existing) { setError(`PAN ${pan} already registered to "${existing.name}". Duplicate org not allowed.`); setSaving(false); return; }
      }
      // 1. Create organization
      const { data: org, error: orgErr } = await sb.from("organizations").insert({
        name: brandName.trim(),
        brand_name: brandName.trim(),
        legal_name: legalName.trim() || null,
        owner_email: ownerEmail.trim().toLowerCase(),
        owner_name: ownerName.trim(),
        industry, state, city: city || null,
        gstin: gstin ? gstin.toUpperCase() : null,
        pan: pan ? pan.toUpperCase() : (gstin ? gstin.slice(2, 12).toUpperCase() : null),
        email: ownerEmail.trim().toLowerCase(),
        plan: "starter", plan_status: "trial",
        trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        country: "IN", currency: "INR", timezone: "Asia/Kolkata",
        country_code: "+91", financial_year_start: "april",
      }).select().single();

      if (orgErr) throw new Error(orgErr.message);

      // 2. Create owner user account
      const { error: userErr } = await sb.from("users").upsert({
        email: ownerEmail.trim().toLowerCase(),
        full_name: ownerName.trim(),
        role: "owner",
        org_id: org.id,
        phone: ownerPhone || null,
      }, { onConflict: "email" }).select().single();

      if (userErr) { console.warn("[org] User upsert warning:", userErr.message); }

      // 3. Send invite email (not OTP — proper branded invite)
      try {
        await fetch("/api/auth/send-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: ownerEmail.trim().toLowerCase(),
            orgName: brandName.trim(),
            ownerName: ownerName.trim(),
            orgId: org.id,
          }),
        });
        setEmailSent(true);
      } catch { /* email send is best-effort */ }

      // 4. Also create the owner as first employee
      try {
        await sb.from("employees").insert({
          org_id: org.id,
          full_name: ownerName.trim(),
          first_name: ownerName.split(" ")[0] || ownerName,
          last_name: ownerName.split(" ").slice(1).join(" ") || null,
          email: ownerEmail.trim().toLowerCase(),
          phone: ownerPhone || null,
          designation: "CEO / Owner",
          department: "Management",
          role: "owner",
          status: "active",
          approval_status: "approved",
          onboarding_completed: false,
          employee_code: "EMP001",
          date_of_joining: new Date().toISOString().split("T")[0],
          salary_type: "fixed", basic_salary: "0", hra: "0",
          special_allowance: "0", other_allowance: "0",
        });
      } catch { /* employee creation is best-effort */ }

      onSave(org as Org);
    } catch (err: any) {
      setError(err.message || "Failed to create organization");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div><h2 className="text-base font-bold text-gray-900">Create new organization</h2><p className="text-xs text-gray-400">This will create the org + send login invite to the owner</p></div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          {/* Company info */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Company information</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Brand name *</label>
                <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Krazy Caterpillar"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Legal name</label>
                <input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="e.g. Minorplayz Kids Corner LLP"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Industry</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100">
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">GSTIN</label>
                <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="Optional"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">PAN *</label>
                <input value={pan} onChange={e => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} placeholder="ABCDE1234F"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                <p className="text-[10px] text-gray-400 mt-1">Unique — prevents duplicate orgs</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                <select value={state} onChange={e => setState(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100">
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Pune"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>
          </div>

          {/* Owner info */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Owner / Admin details</p>
            <p className="text-xs text-gray-400 mb-3">This person will receive a login invite and have full admin access to the organization</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Owner name *</label>
                <input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="e.g. Raj Dubey"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Owner email *</label>
                <input value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} type="email" placeholder="e.g. contactus@krazycaterpillar.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Owner phone</label>
                <input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Optional"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>
          </div>

          {/* Preview */}
          {brandName && ownerEmail && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <p className="text-xs font-bold text-indigo-700 uppercase mb-2">What will happen</p>
              <div className="space-y-1.5 text-sm text-indigo-800">
                <p>1. Organization <strong>{brandName}</strong>{legalName ? ` (${legalName})` : ""} will be created</p>
                <p>2. <strong>{ownerName || "Owner"}</strong> will be added as owner + first employee</p>
                <p>3. Login OTP will be sent to <strong>{ownerEmail}</strong></p>
                <p>4. Owner can then set up departments, verticals, and add employees</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Create & send invite
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function OrganizationsPage() {
  const sb = useSB();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); } }, [toast]);

  const archiveOrg = async (orgId: string) => {
    setDeleting(orgId);
    try {
      // 1. Archive org data
      const { data: orgData } = await sb.from("organizations").select("*").eq("id", orgId).maybeSingle();
      if (orgData) await sb.from("archived_organizations").upsert({ id: orgId, original_data: orgData, deleted_at: new Date().toISOString() });

      // 2. Archive employees
      const { data: emps } = await sb.from("employees").select("*").eq("org_id", orgId);
      if (emps) {
        for (const emp of emps) {
          await sb.from("archived_employees").upsert({ id: emp.id, org_id: orgId, original_data: emp, deleted_at: new Date().toISOString() });
        }
      }

      // 3. Delete in order (dependents first)
      for (const table of ["approval_history","approval_requests","notifications","leaves","leave_requests","attendance","payslips","employees","departments","verticals","org_locations","users"]) {
        try { await sb.from(table).delete().eq("org_id", orgId); } catch {}
      }
      // Delete users linked to this org
      await sb.from("users").delete().eq("org_id", orgId);
      // Delete the org itself
      await sb.from("organizations").delete().eq("id", orgId);

      setOrgs(p => p.filter(o => o.id !== orgId));
      setToast("Organization archived & deleted");
    } catch (err: any) {
      setToast("Delete failed: " + (err.message || "unknown error"));
    } finally { setDeleting(null); }
  };

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("organizations").select("*").order("created_at", { ascending: false });
    setOrgs((data || []) as Org[]);
    setLoading(false);
  }, [sb]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const filtered = orgs.filter(o => {
    const q = search.toLowerCase();
    return !q || o.name?.toLowerCase().includes(q) || o.legal_name?.toLowerCase().includes(q) || o.owner_email?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto">
      {showCreate && <CreateOrgModal onSave={org => { setOrgs(p => [org, ...p]); setShowCreate(false); setToast(`${org.name} created! Invite sent to owner.`); }} onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div><h1 className="text-xl font-bold text-gray-900">Organizations</h1><p className="text-sm text-gray-400">Manage all companies on the platform</p></div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700"><Plus className="w-4 h-4" />Create organization</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { l: "Total orgs", v: orgs.length, bg: "bg-indigo-50", c: "text-indigo-600", ic: <Building2 className="w-4 h-4" /> },
          { l: "Active trials", v: orgs.filter(o => o.plan_status === "trial").length, bg: "bg-amber-50", c: "text-amber-600", ic: <Crown className="w-4 h-4" /> },
          { l: "Total employees", v: orgs.reduce((s, o) => s + (o.employee_count || 0), 0), bg: "bg-emerald-50", c: "text-emerald-600", ic: <Users className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} ${s.c} flex items-center justify-center`}>{s.ic}</div>
            <div><p className="text-xs text-gray-400">{s.l}</p><p className="text-xl font-bold text-gray-900">{s.v}</p></div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orgs..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100" />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" /><p className="text-sm text-gray-400 mt-2">Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">{orgs.length === 0 ? "No organizations yet" : "No matches"}</p>
            <p className="text-xs text-gray-400 mb-4">Create the first organization to get started</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl"><Plus className="w-4 h-4 inline mr-1" />Create organization</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(org => (
              <div key={org.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition cursor-pointer"
                onClick={() => { localStorage.setItem("activeOrgId", org.id); localStorage.setItem("activeOrgName", org.name); window.location.href = "/dashboard"; }}>
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                  {(org.brand_name || org.name || "O").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{org.brand_name || org.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${org.plan_status === "trial" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{org.plan} · {org.plan_status}</span>
                  </div>
                  {org.legal_name && <p className="text-xs text-gray-400">{org.legal_name}</p>}
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    {org.owner_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{org.owner_email}</span>}
                    {org.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{org.city}, {org.state}</span>}
                    <span>Created {fmtDate(org.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {deleting === org.id ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : (
                    <button onClick={e => { e.stopPropagation(); if (confirm(`Archive & delete "${org.name}"? Data will be preserved in archives.`)) archiveOrg(org.id); }}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Archive & delete">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800"><CheckCircle2 className="w-4 h-4" />{toast}</div>}
    </div>
  );
}