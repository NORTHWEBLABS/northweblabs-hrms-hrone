"use client";
// Route: app/(dashboard)/loans/page.tsx
// Manage employee loans & advances. Create, track outstanding balance, view repayment ledger.
// Payroll reads active loans and shows the monthly installment as an editable deduction.

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Wallet, Plus, X, Loader2, AlertCircle, CheckCircle2, RefreshCw,
  IndianRupee, TrendingDown, Clock, ChevronDown, History, Users, Check,
} from "lucide-react";

function useSB() {
  return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
}

interface Emp { id: string; full_name: string; employee_code: string | null; department: string | null; }
interface Loan {
  id: string; employee_id: string; type: "loan" | "advance";
  principal: number; flat_charge: number; total_recoverable: number;
  schedule_mode: "installment" | "months"; installment: number; months: number | null;
  recovered: number; start_month: number; start_year: number;
  status: "active" | "closed"; reason: string | null; created_at: string;
}
interface Repayment { id: string; loan_id: string; month: number; year: number; amount: number; balance_after: number; created_at: string; }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtINR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
const getInitials = (n: string) => n.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
const avatarColor = (n: string) => ["bg-indigo-100 text-indigo-700","bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-purple-100 text-purple-700"][n.charCodeAt(0)%5];

function Toast({ message, type, onClose }: { message:string; type:"success"|"error"; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${type==="success"?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-red-50 border-red-200 text-red-800"}`}>
      {type==="success"?<CheckCircle2 className="w-4 h-4 text-emerald-600"/>:<AlertCircle className="w-4 h-4 text-red-500"/>}{message}
      <button onClick={onClose}><X className="w-3.5 h-3.5 opacity-50"/></button>
    </div>
  );
}

function NewLoanModal({ employees, orgId, onClose, onDone }: { employees: Emp[]; orgId: string; onClose:()=>void; onDone:(m:string,ok:boolean)=>void }) {
  const sb = useSB();
  const now = new Date();
  const [empId, setEmpId] = useState("");
  const [type, setType] = useState<"loan"|"advance">("advance");
  const [principal, setPrincipal] = useState("");
  const [flatCharge, setFlatCharge] = useState("");
  const [mode, setMode] = useState<"installment"|"months">("installment");
  const [installment, setInstallment] = useState("");
  const [months, setMonths] = useState("");
  const [startMonth, setStartMonth] = useState(now.getMonth()+1);
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const total = (Number(principal)||0) + (Number(flatCharge)||0);
  const computedInstallment = mode==="months" && Number(months)>0 ? Math.round(total / Number(months)) : Number(installment)||0;
  const computedMonths = mode==="installment" && Number(installment)>0 ? Math.ceil(total / Number(installment)) : Number(months)||0;

  const submit = async () => {
    if (!empId) { setErr("Select an employee"); return; }
    if (total <= 0) { setErr("Principal must be greater than 0"); return; }
    if (mode==="installment" && !(Number(installment)>0)) { setErr("Enter a monthly installment"); return; }
    if (mode==="months" && !(Number(months)>0)) { setErr("Enter number of months"); return; }
    setSaving(true); setErr("");
    try {
      const { error } = await sb.from("loans").insert({
        org_id: orgId, employee_id: empId, type,
        principal: Number(principal)||0, flat_charge: Number(flatCharge)||0,
        total_recoverable: total, schedule_mode: mode,
        installment: computedInstallment, months: mode==="months" ? Number(months) : computedMonths,
        recovered: 0, start_month: startMonth, start_year: startYear,
        status: "active", reason: reason.trim() || null,
      });
      if (error) { setErr(error.message); setSaving(false); return; }
      onDone(`${type==="loan"?"Loan":"Advance"} created`, true);
    } catch (e:any) { setErr(e.message||"Failed"); setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100";
  const years = [now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-bold text-gray-900">New loan / advance</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400"/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {err && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Employee *</label>
            <div className="relative">
              <select value={empId} onChange={e=>setEmpId(e.target.value)} className={`${inputCls} appearance-none pr-8`}>
                <option value="">Select employee...</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.full_name} {e.employee_code?`(${e.employee_code})`:""}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none"/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["advance","loan"] as const).map(t=>(
                <button key={t} onClick={()=>setType(t)} className={`px-3 py-2 rounded-xl border text-xs font-medium capitalize ${type===t?"bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-100":"bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {t==="advance"?"Salary advance":"Loan"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Principal *</label><input type="number" value={principal} onChange={e=>setPrincipal(e.target.value)} placeholder="30000" className={inputCls}/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Flat charge</label><input type="number" value={flatCharge} onChange={e=>setFlatCharge(e.target.value)} placeholder="0" className={inputCls}/></div>
          </div>
          {total>0 && <p className="text-xs text-gray-500">Total recoverable: <span className="font-bold text-gray-700">{fmtINR(total)}</span></p>}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recovery schedule</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(["installment","months"] as const).map(m=>(
                <button key={m} onClick={()=>setMode(m)} className={`px-3 py-2 rounded-xl border text-xs font-medium ${mode===m?"bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-100":"bg-gray-50 text-gray-600 border-gray-200"}`}>
                  {m==="installment"?"By monthly amount":"By # of months"}
                </button>
              ))}
            </div>
            {mode==="installment" ? (
              <input type="number" value={installment} onChange={e=>setInstallment(e.target.value)} placeholder="Monthly installment e.g. 5000" className={inputCls}/>
            ) : (
              <input type="number" value={months} onChange={e=>setMonths(e.target.value)} placeholder="Number of months e.g. 6" className={inputCls}/>
            )}
            {total>0 && (mode==="installment" ? Number(installment)>0 : Number(months)>0) && (
              <p className="text-xs text-indigo-600 mt-1.5">
                {mode==="installment" ? `≈ ${computedMonths} months at ${fmtINR(Number(installment))}/mo` : `${fmtINR(computedInstallment)}/mo over ${months} months`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Recovery starts</label>
              <div className="relative">
                <select value={startMonth} onChange={e=>setStartMonth(Number(e.target.value))} className={`${inputCls} appearance-none pr-8`}>
                  {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
              <div className="relative">
                <select value={startYear} onChange={e=>setStartYear(Number(e.target.value))} className={`${inputCls} appearance-none pr-8`}>
                  {years.map(y=><option key={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none"/>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason / note</label>
            <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Medical advance" className={inputCls}/>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>}Create
          </button>
        </div>
      </div>
    </div>
  );
}

function LedgerModal({ loan, emp, onClose }: { loan: Loan; emp: Emp | undefined; onClose:()=>void }) {
  const sb = useSB();
  const [rows, setRows] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await sb.from("loan_repayments").select("*").eq("loan_id", loan.id).order("year").order("month");
      setRows((data||[]) as Repayment[]); setLoading(false);
    })();
  }, [sb, loan.id]);
  const outstanding = loan.total_recoverable - loan.recovered;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="px-6 py-4 bg-[#0f172a] text-white flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider">{loan.type} ledger</p>
            <h2 className="text-base font-bold">{emp?.full_name || "Employee"}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-6 py-4 grid grid-cols-3 gap-2 border-b border-gray-100">
          <div><p className="text-xs text-gray-400">Total</p><p className="text-sm font-bold text-gray-900">{fmtINR(loan.total_recoverable)}</p></div>
          <div><p className="text-xs text-gray-400">Recovered</p><p className="text-sm font-bold text-emerald-600">{fmtINR(loan.recovered)}</p></div>
          <div><p className="text-xs text-gray-400">Outstanding</p><p className="text-sm font-bold text-red-500">{fmtINR(outstanding)}</p></div>
        </div>
        <div className="px-6 py-4 max-h-[40vh] overflow-y-auto">
          {loading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin"/></div>
            : rows.length===0 ? <p className="text-sm text-gray-400 text-center py-6">No recoveries yet</p>
            : (
              <div className="space-y-2">
                {rows.map(r=>(
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{MONTHS[r.month-1]} {r.year}</span>
                    <div className="text-right">
                      <span className="text-sm font-mono text-red-600">-{fmtINR(r.amount)}</span>
                      <p className="text-xs text-gray-400">bal {fmtINR(r.balance_after)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function LoansPage() {
  const sb = useSB();
  const [orgId, setOrgId] = useState("");
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [ledger, setLedger] = useState<Loan | null>(null);
  const [filter, setFilter] = useState<"active"|"closed"|"all">("active");
  const [toast, setToast] = useState<{message:string;type:"success"|"error"}|null>(null);

  const empMap = useMemo(() => Object.fromEntries(employees.map(e=>[e.id, e])), [employees]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const oid = (typeof window!=="undefined" && localStorage.getItem("activeOrgId")) || "";
      let resolvedOrg = oid;
      if (!resolvedOrg) {
        const { data: f } = await sb.from("organizations").select("id").order("created_at").limit(1).maybeSingle();
        resolvedOrg = f?.id || "";
      }
      setOrgId(resolvedOrg);
      if (!resolvedOrg) { setLoading(false); return; }
      const [{ data: emps }, { data: lns }] = await Promise.all([
        sb.from("employees").select("id, full_name, employee_code, department").eq("org_id", resolvedOrg).eq("status","active").order("full_name"),
        sb.from("loans").select("*").eq("org_id", resolvedOrg).order("created_at", { ascending: false }),
      ]);
      setEmployees((emps||[]) as Emp[]);
      setLoans((lns||[]) as Loan[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [sb]);

  useEffect(() => { load(); }, [load]);

  const closeLoan = async (id: string) => {
    await sb.from("loans").update({ status: "closed" }).eq("id", id);
    setToast({ message: "Loan closed", type: "success" }); load();
  };

  const shown = loans.filter(l => filter==="all" ? true : l.status===filter);
  const totalOutstanding = loans.filter(l=>l.status==="active").reduce((s,l)=>s+(l.total_recoverable-l.recovered),0);
  const activeCount = loans.filter(l=>l.status==="active").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Loans &amp; advances</h1>
          <p className="text-xs text-gray-400 mt-0.5">Recoveries appear automatically in payroll as an editable deduction</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
          <button onClick={()=>setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b]"><Plus className="w-4 h-4"/>New loan / advance</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          {label:"Active loans",value:String(activeCount),icon:<Wallet className="w-4 h-4"/>,tc:"text-indigo-600",bc:"bg-indigo-50"},
          {label:"Total outstanding",value:fmtINR(totalOutstanding),icon:<TrendingDown className="w-4 h-4"/>,tc:"text-red-500",bc:"bg-red-50"},
          {label:"Employees with dues",value:String(new Set(loans.filter(l=>l.status==="active").map(l=>l.employee_id)).size),icon:<Users className="w-4 h-4"/>,tc:"text-amber-600",bc:"bg-amber-50"},
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bc} ${s.tc} flex items-center justify-center`}>{s.icon}</div>
            <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-base font-bold text-gray-900">{s.value}</p></div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(["active","closed","all"] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize ${filter===f?"bg-white text-gray-900 shadow-sm":"text-gray-500"}`}>{f}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin"/><span className="text-sm text-gray-500">Loading...</span></div>
        ) : shown.length===0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2"><Wallet className="w-8 h-8 text-gray-300"/><p className="text-sm text-gray-500">No {filter==="all"?"":filter} loans</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {["Employee","Type","Total","Recovered","Outstanding","Installment","Starts","Status",""].map(h=>(
                  <th key={h} className={`text-xs font-semibold text-gray-500 px-4 py-3 ${["Total","Recovered","Outstanding","Installment"].includes(h)?"text-right":"text-left"}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map(l=>{
                  const emp = empMap[l.employee_id];
                  const outstanding = l.total_recoverable - l.recovered;
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor(emp?.full_name||"?")}`}>{getInitials(emp?.full_name||"?")}</div>
                          <div><p className="text-sm font-semibold text-gray-900">{emp?.full_name||"Unknown"}</p><p className="text-xs text-gray-400">{emp?.department||""}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${l.type==="loan"?"bg-blue-100 text-blue-700":"bg-violet-100 text-violet-700"}`}>{l.type}</span></td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-gray-700">{fmtINR(l.total_recoverable)}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-emerald-600">{fmtINR(l.recovered)}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono font-bold text-red-500">{fmtINR(outstanding)}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-gray-600">{fmtINR(l.installment)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{MONTHS[l.start_month-1]} {l.start_year}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${l.status==="active"?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-500"}`}>{l.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={()=>setLedger(l)} className="p-1.5 hover:bg-indigo-50 rounded-lg" title="Ledger"><History className="w-3.5 h-3.5 text-indigo-500"/></button>
                          {l.status==="active" && outstanding<=0 && <button onClick={()=>closeLoan(l.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg" title="Close (fully recovered)"><Check className="w-3.5 h-3.5 text-emerald-500"/></button>}
                          {l.status==="active" && outstanding>0 && <button onClick={()=>closeLoan(l.id)} className="text-xs text-gray-400 hover:text-red-500 px-1" title="Force close">close</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && <NewLoanModal employees={employees} orgId={orgId} onClose={()=>setShowNew(false)} onDone={(m,ok)=>{setShowNew(false);setToast({message:m,type:ok?"success":"error"});if(ok)load();}}/>}
      {ledger && <LedgerModal loan={ledger} emp={empMap[ledger.employee_id]} onClose={()=>setLedger(null)}/>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}
