"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import Link from "next/link";
import {
  IndianRupee, Check, X, ChevronDown, ChevronLeft,
  Download, Eye, Loader2, AlertCircle, CheckCircle2,
  Users, TrendingUp, TrendingDown, RefreshCw,
  Zap, Clock, Building2, Shield, ArrowRight,
} from "lucide-react";

// ─── PREVIEW MODE ─────────────────────────────────────────────────────────────
// Marketing-site preview of the Payroll module. All Supabase calls replaced
// with in-memory mock data. The payroll engine (PF/ESIC/PT/TDS) is the real
// thing — only persistence is simulated. Nothing is saved.

// ─── Types ────────────────────────────────────────────────────────────────────
interface Employee {
  id: string;
  full_name: string;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  basic_salary: number;
  hra: number;
  special_allowance: number;
  other_allowance: number;
  gross_salary: number;
  pf_applicable: boolean;
  esic_applicable: boolean;
  pt_applicable: boolean;
  salary_type: "fixed" | "variable";
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
}

interface PayslipRow {
  employee: Employee;
  basic_earned: number;
  hra_earned: number;
  special_allowance_earned: number;
  other_allowance_earned: number;
  gross_earned: number;
  bonus: number;
  pf_employee: number;
  esic_employee: number;
  pt_amount: number;
  tds_amount: number;
  other_deductions: number;
  total_deductions: number;
  net_payable: number;
  pf_employer: number;
  esic_employer: number;
  days_present: number;
  working_days: number;
  override_bonus: number;
  override_other_deductions: number;
  override_other_allowance: number;
  override_days_present: number;
}

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: "draft" | "processing" | "completed" | "paid";
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_pf_employer: number;
  total_esic_employer: number;
  processed_at: string | null;
  paid_at: string | null;
  created_at: string;
}

// ─── Payroll Engine ───────────────────────────────────────────────────────────
const PT_MAHARASHTRA = (gross: number, month: number): number => {
  if (gross < 7500) return 0;
  if (gross <= 10000) return 175;
  return month === 2 ? 300 : 200;
};

const TDS_NEW_REGIME = (annualGross: number): number => {
  const taxable = Math.max(0, annualGross - 75000);
  let tax = 0;
  if (taxable <= 300000) tax = 0;
  else if (taxable <= 700000) tax = (taxable - 300000) * 0.05;
  else if (taxable <= 1000000) tax = 20000 + (taxable - 700000) * 0.10;
  else if (taxable <= 1200000) tax = 50000 + (taxable - 1000000) * 0.15;
  else if (taxable <= 1500000) tax = 80000 + (taxable - 1200000) * 0.20;
  else tax = 140000 + (taxable - 1500000) * 0.30;
  return Math.round(tax / 12);
};

function calcPayslip(emp: Employee, daysPresent: number, workingDays: number, month: number, bonus: number, otherDed: number, otherAllow: number): PayslipRow {
  const ratio = workingDays > 0 ? daysPresent / workingDays : 1;
  const basicEarned = Math.round(emp.basic_salary * ratio);
  const hraEarned = Math.round(emp.hra * ratio);
  const specialEarned = Math.round(emp.special_allowance * ratio);
  const otherEarned = Math.round((emp.other_allowance + otherAllow) * ratio);
  const grossEarned = basicEarned + hraEarned + specialEarned + otherEarned + bonus;

  const pfBase = Math.min(basicEarned, 15000);
  const pfEmployee = emp.pf_applicable ? Math.round(pfBase * 0.12) : 0;
  const pfEmployer = emp.pf_applicable ? Math.round(pfBase * 0.13) : 0;
  const esicEmployee = emp.esic_applicable && grossEarned <= 21000 ? Math.round(grossEarned * 0.0075) : 0;
  const esicEmployer = emp.esic_applicable && grossEarned <= 21000 ? Math.round(grossEarned * 0.0325) : 0;
  const ptAmount = emp.pt_applicable ? PT_MAHARASHTRA(grossEarned, month) : 0;
  const tdsAmount = TDS_NEW_REGIME(grossEarned * 12);
  const totalDeductions = pfEmployee + esicEmployee + ptAmount + tdsAmount + otherDed;

  return {
    employee: emp,
    basic_earned: basicEarned, hra_earned: hraEarned,
    special_allowance_earned: specialEarned, other_allowance_earned: otherEarned,
    gross_earned: grossEarned, bonus,
    pf_employee: pfEmployee, esic_employee: esicEmployee,
    pt_amount: ptAmount, tds_amount: tdsAmount,
    other_deductions: otherDed, total_deductions: totalDeductions,
    net_payable: Math.max(0, grossEarned - totalDeductions),
    pf_employer: pfEmployer, esic_employer: esicEmployer,
    days_present: daysPresent, working_days: workingDays,
    override_bonus: bonus, override_other_deductions: otherDed,
    override_other_allowance: otherAllow, override_days_present: daysPresent,
  };
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const ORG_NAME = "NorthWeb Labs — Demo";
const uid = () => Math.random().toString(36).slice(2, 10);

const ME = (
  id: string, name: string, code: string, dept: string, desig: string,
  basic: number, hra: number, special: number, other: number,
  pf = true, esic = false, pt = true,
  bank: [string, string, string] | null = null,
): Employee => ({
  id, full_name: name, employee_code: code, department: dept, designation: desig,
  basic_salary: basic, hra, special_allowance: special, other_allowance: other,
  gross_salary: basic + hra + special + other,
  pf_applicable: pf, esic_applicable: esic, pt_applicable: pt,
  salary_type: "fixed",
  bank_name: bank?.[0] ?? null, bank_account: bank?.[1] ?? null, bank_ifsc: bank?.[2] ?? null,
});

const MOCK_EMPLOYEES: Employee[] = [
  ME("e01", "Ananya Iyer",  "NWL001", "Engineering", "Engineering Lead",  60000, 24000, 12000, 4000, true, false, true, ["HDFC Bank", "50100234567890", "HDFC0001234"]),
  ME("e02", "Arjun Kapoor", "NWL002", "Engineering", "Senior Developer",  45000, 18000,  9000, 3000, true, false, true, ["ICICI Bank", "002301567890", "ICIC0000023"]),
  ME("e03", "Priya Sharma", "NWL003", "Design",      "Product Designer",  38000, 15200,  7600, 2200, true, false, true, ["SBI", "32145678901", "SBIN0001100"]),
  ME("e04", "Rahul Verma",  "NWL004", "Finance",     "Accounts Manager",  35000, 14000,  7000, 2000, true, false, true, ["Axis Bank", "9120045678901", "UTIB0000456"]),
  ME("e05", "Sneha Reddy",  "NWL005", "Engineering", "Developer",         30000, 12000,  6000, 2000, true, false, true, ["HDFC Bank", "50100765432109", "HDFC0001234"]),
  ME("e06", "Vikram Singh", "NWL006", "Sales",       "Sales Manager",     32000, 12800,  6400, 1800, true, false, true, ["Kotak Bank", "7045678901234", "KKBK0000958"]),
  ME("e07", "Meera Nair",   "NWL007", "Operations",  "Ops Executive",     16000,  6400,  3200,  900, true, true,  true, ["SBI", "32109876543", "SBIN0001100"]),
  ME("e08", "Karan Mehta",  "NWL008", "Sales",       "Sales Executive",   14000,  5600,  2800,  800, true, true,  true, ["ICICI Bank", "002309876543", "ICIC0000023"]),
  ME("e09", "Divya Pillai", "NWL009", "Design",      "UI Designer",       26000, 10400,  5200, 1500, true, false, true, ["Axis Bank", "9120098765432", "UTIB0000456"]),
  ME("e10", "Rohan Joshi",  "NWL010", "Operations",  "Office Assistant",  11000,  4400,  2200,  600, true, true,  true, ["SBI", "32101234567", "SBIN0001100"]),
];

// Deterministic mock presence so numbers stay stable across re-renders.
const mockDaysPresent = (empIndex: number, month: number, year: number, workingDays: number): number => {
  const missed = ((empIndex * 3 + month * 7 + year) % 7) * 0.5; // 0 to 3 days
  return Math.max(0, workingDays - missed);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const getMonthName = (m: number) => MONTHS[m - 1];

function getWorkingDays(year: number, month: number): number {
  let count = 0;
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

const getInitials = (name: string) => name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
const avatarColor = (name: string) => {
  const c = ["bg-indigo-100 text-indigo-700","bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-purple-100 text-purple-700"];
  return c[name.charCodeAt(0) % c.length];
};

// Seed three "paid" runs in the months before the current one.
function buildInitialRuns(): PayrollRun[] {
  const now = new Date();
  const runs: PayrollRun[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const workingDays = getWorkingDays(year, month);
    const slips = MOCK_EMPLOYEES.map((emp, ei) =>
      calcPayslip(emp, mockDaysPresent(ei, month, year, workingDays), workingDays, month, 0, 0, 0));
    const processed = new Date(year, month - 1, 28, 11, 30).toISOString();
    const paid = new Date(year, month, 1, 10, 0).toISOString();
    runs.push({
      id: uid(), month, year, status: "paid",
      total_gross: slips.reduce((a,r)=>a+r.gross_earned,0),
      total_deductions: slips.reduce((a,r)=>a+r.total_deductions,0),
      total_net: slips.reduce((a,r)=>a+r.net_payable,0),
      total_pf_employer: slips.reduce((a,r)=>a+r.pf_employer,0),
      total_esic_employer: slips.reduce((a,r)=>a+r.esic_employer,0),
      processed_at: processed, paid_at: paid, created_at: processed,
    });
  }
  return runs;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message:string; type:"success"|"error"; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium
      ${type==="success"?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-red-50 border-red-200 text-red-800"}`}>
      {type==="success"?<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0"/>:<AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>}
      {message}
      <button onClick={onClose}><X className="w-3.5 h-3.5 opacity-50 hover:opacity-100"/></button>
    </div>
  );
}

// ─── Payslip Modal ────────────────────────────────────────────────────────────
function PayslipModal({ row, month, year, orgName, onClose }: { row:PayslipRow; month:number; year:number; orgName:string; onClose:()=>void }) {
  const Section = ({ title, rows, variant }: { title:string; rows:[string,number][]; variant:"earn"|"ded"|"er" }) => (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="bg-gray-50 rounded-xl overflow-hidden">
        {rows.filter(([,v])=>v>0).map(([l,v])=>(
          <div key={l} className="flex justify-between px-4 py-2 border-b border-gray-100 last:border-0 text-sm">
            <span className="text-gray-600">{l}</span>
            <span className={`font-mono ${variant==="earn"?"text-gray-800":variant==="ded"?"text-red-600":"text-blue-600"}`}>
              {variant==="ded"?"-":""}{fmtINR(v)}
            </span>
          </div>
        ))}
        {rows.filter(([,v])=>v>0).length===0&&<div className="px-4 py-2 text-sm text-gray-400">None</div>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 bg-[#0f172a] text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Salary Slip</p>
              <h2 className="text-base font-bold">{orgName}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-4 h-4"/></button>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold">{row.employee.full_name}</p>
              <p className="text-xs text-white/50">{row.employee.designation} · {row.employee.department}</p>
              <p className="text-xs text-white/40 mt-0.5 font-mono">{row.employee.employee_code}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">Pay period</p>
              <p className="text-sm font-semibold">{getMonthName(month)} {year}</p>
              <p className="text-xs text-white/50">{row.days_present}/{row.working_days} days</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 max-h-[55vh] overflow-y-auto">
          <Section title="Earnings" variant="earn" rows={[
            ["Basic salary", row.basic_earned], ["HRA", row.hra_earned],
            ["Special allowance", row.special_allowance_earned], ["Other allowance", row.other_allowance_earned],
            ["Bonus", row.bonus],
          ]}/>
          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold">
            <span className="text-emerald-800">Gross earned</span>
            <span className="font-mono text-emerald-900">{fmtINR(row.gross_earned)}</span>
          </div>
          <Section title="Deductions" variant="ded" rows={[
            ["PF (Employee 12%)", row.pf_employee], ["ESIC (Employee 0.75%)", row.esic_employee],
            ["Professional Tax", row.pt_amount], ["TDS", row.tds_amount], ["Other deductions", row.other_deductions],
          ]}/>
          <div className="flex items-center justify-between px-5 py-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Net take-home</p>
              <p className="text-xs text-indigo-400 mt-0.5">After all deductions</p>
            </div>
            <p className="text-2xl font-bold text-indigo-900">{fmtINR(row.net_payable)}</p>
          </div>
          <Section title="Employer contributions (not deducted)" variant="er" rows={[
            ["PF Employer 13%", row.pf_employer], ["ESIC Employer 3.25%", row.esic_employer],
          ]}/>
          {row.employee.bank_account && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0"/>
              <div>
                <p className="text-xs font-semibold text-gray-700">{row.employee.bank_name}</p>
                <p className="text-xs text-gray-400 font-mono">A/C ****{row.employee.bank_account.slice(-4)} · {row.employee.bank_ifsc}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">Computer-generated salary slip · {getMonthName(month)} {year}</p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Close</button>
          <button onClick={() => window.print()}
            className="flex-1 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-[#1e293b] flex items-center justify-center gap-2">
            <Download className="w-4 h-4"/>Download slip
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Override Cell ────────────────────────────────────────────────────────────
function OverrideCell({ value, onChange, prefix="₹" }: { value:number; onChange:(v:number)=>void; prefix?:string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  useEffect(() => { setVal(String(value)); }, [value]);

  if (editing) return (
    <input autoFocus type="number" value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { onChange(Number(val)||0); setEditing(false); }}
      onKeyDown={e => { if(e.key==="Enter"){onChange(Number(val)||0);setEditing(false);} if(e.key==="Escape")setEditing(false); }}
      className="w-20 px-1.5 py-0.5 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 text-right font-mono"
    />
  );
  return (
    <button onClick={() => setEditing(true)} className="text-xs font-mono text-gray-700 hover:text-indigo-600 hover:underline">
      {prefix}{value.toLocaleString("en-IN")}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollPreviewPage() {
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const orgName = ORG_NAME;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [allRuns, setAllRuns] = useState<PayrollRun[]>([]);
  const [existingRun, setExistingRun] = useState<PayrollRun | null>(null);
  const [pastRuns, setPastRuns] = useState<PayrollRun[]>([]);
  const [view, setView] = useState<"run"|"history">("run");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string|null>(null);
  const [payslipModal, setPayslipModal] = useState<PayslipRow|null>(null);
  const [toast, setToast] = useState<{message:string;type:"success"|"error"}|null>(null);

  const workingDays = useMemo(() => getWorkingDays(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  // ── Load mock data (replaces the Supabase fetch) ──────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 350)); // simulate network

    setAllRuns(prev => {
      const runs = prev.length ? prev : buildInitialRuns();
      setExistingRun(runs.find(r => r.month === selectedMonth && r.year === selectedYear) ?? null);
      setPastRuns([...runs].sort((a,b) => b.year - a.year || b.month - a.month).slice(0, 12));
      return runs;
    });

    setEmployees(MOCK_EMPLOYEES);
    setPayslips(MOCK_EMPLOYEES.map((emp, ei) => calcPayslip(
      emp,
      mockDaysPresent(ei, selectedMonth, selectedYear, workingDays),
      workingDays, selectedMonth, 0, 0, 0
    )));
    setLoading(false);
  }, [selectedMonth, selectedYear, workingDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updatePayslip = (empId: string, field: string, value: number) => {
    setPayslips(prev => prev.map(row => {
      if (row.employee.id !== empId) return row;
      const dp = field==="override_days_present" ? value : row.override_days_present;
      const bn = field==="override_bonus" ? value : row.override_bonus;
      const od = field==="override_other_deductions" ? value : row.override_other_deductions;
      const oa = field==="override_other_allowance" ? value : row.override_other_allowance;
      return calcPayslip(row.employee, dp, workingDays, selectedMonth, bn, od, oa);
    }));
  };

  // ── Process payroll (in-memory) ─────────────────────────────────────────────
  const processPayroll = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 700)); // simulate processing

    const run: PayrollRun = {
      id: existingRun?.id ?? uid(),
      month: selectedMonth, year: selectedYear, status: "completed",
      total_gross: payslips.reduce((a,r)=>a+r.gross_earned,0),
      total_deductions: payslips.reduce((a,r)=>a+r.total_deductions,0),
      total_net: payslips.reduce((a,r)=>a+r.net_payable,0),
      total_pf_employer: payslips.reduce((a,r)=>a+r.pf_employer,0),
      total_esic_employer: payslips.reduce((a,r)=>a+r.esic_employer,0),
      processed_at: new Date().toISOString(),
      paid_at: null,
      created_at: existingRun?.created_at ?? new Date().toISOString(),
    };

    setAllRuns(prev => {
      const next = [...prev.filter(r => !(r.month === selectedMonth && r.year === selectedYear)), run];
      setPastRuns([...next].sort((a,b) => b.year - a.year || b.month - a.month).slice(0, 12));
      return next;
    });
    setExistingRun(run);
    setProcessing(false);
    setToast({message:`Payroll processed for ${payslips.length} employees`,type:"success"});
  };

  // ── Mark as paid (in-memory) ────────────────────────────────────────────────
  const markAsPaid = () => {
    if (!existingRun) return;
    const paid: PayrollRun = { ...existingRun, status: "paid", paid_at: new Date().toISOString() };
    setAllRuns(prev => {
      const next = prev.map(r => r.id === paid.id ? paid : r);
      setPastRuns([...next].sort((a,b) => b.year - a.year || b.month - a.month).slice(0, 12));
      return next;
    });
    setExistingRun(paid);
    setToast({message:"Payroll marked as paid",type:"success"});
  };

  const totalGross = payslips.reduce((a,r)=>a+r.gross_earned,0);
  const totalDed   = payslips.reduce((a,r)=>a+r.total_deductions,0);
  const totalNet   = payslips.reduce((a,r)=>a+r.net_payable,0);
  const totalPfEr  = payslips.reduce((a,r)=>a+r.pf_employer,0);
  const totalEsicEr= payslips.reduce((a,r)=>a+r.esic_employer,0);

  const statusBadge = (s:PayrollRun["status"]) => {
    const map={draft:"bg-gray-100 text-gray-600",processing:"bg-amber-100 text-amber-700",completed:"bg-blue-100 text-blue-700",paid:"bg-emerald-100 text-emerald-700"};
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[s]}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>;
  };

  const years = [now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1];

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
            <span className="font-semibold">Payroll — interactive preview</span>
            <span className="hidden sm:inline text-xs text-gray-400">Sample data · changes aren&rsquo;t saved</span>
          </div>
          <Link href="/signup" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-semibold px-4 py-1.5 rounded-lg">
            Start free <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Payroll</h1>
          <p className="text-xs text-gray-400 mt-0.5">{orgName} · {getMonthName(selectedMonth)} {selectedYear} · {workingDays} working days</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}
              className="pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200">
              {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
          </div>
          <div className="relative">
            <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}
              className="pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200">
              {years.map(y=><option key={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-500"/>
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[["run","Process payroll"],["history","History"]].map(([key,label])=>(
          <button key={key} onClick={()=>setView(key as "run"|"history")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view===key?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* History */}
      {view==="history" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Past payroll runs</h3>
          </div>
          {pastRuns.length===0?(
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Clock className="w-8 h-8 text-gray-300"/>
              <p className="text-sm text-gray-500">No payroll runs yet</p>
            </div>
          ):(
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Period","Status","Gross","Net payable","PF+ESIC (ER)","Processed","Paid",""].map(h=>(
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pastRuns.map(run=>(
                    <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{getMonthName(run.month)} {run.year}</td>
                      <td className="px-4 py-3">{statusBadge(run.status)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{fmtINR(run.total_gross)}</td>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-emerald-700">{fmtINR(run.total_net)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-blue-600">{fmtINR(run.total_pf_employer+run.total_esic_employer)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{run.processed_at?fmtDate(run.processed_at):"—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{run.paid_at?fmtDate(run.paid_at):"—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={()=>{setSelectedMonth(run.month);setSelectedYear(run.year);setView("run");}}
                          className="text-xs text-indigo-600 hover:underline font-medium">View →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Run payroll */}
      {view==="run" && (
        <>
          {/* Status banner */}
          {existingRun && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              existingRun.status==="paid"?"bg-emerald-50 border-emerald-200":
              existingRun.status==="completed"?"bg-blue-50 border-blue-200":"bg-amber-50 border-amber-200"}`}>
              {existingRun.status==="paid"
                ?<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0"/>
                :<Clock className="w-4 h-4 text-blue-600 flex-shrink-0"/>}
              <p className="text-sm font-medium text-gray-800 flex-1">
                {existingRun.status==="paid"
                  ?`Payroll paid on ${existingRun.paid_at?fmtDate(existingRun.paid_at):"—"}`
                  :existingRun.status==="completed"
                  ?"Payroll processed. Ready to mark as paid."
                  :"Payroll run in progress"}
              </p>
              {statusBadge(existingRun.status)}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {label:"Employees",value:String(employees.length),sub:"Active",icon:<Users className="w-4 h-4"/>,tc:"text-blue-600",bc:"bg-blue-50"},
              {label:"Total gross",value:fmtINR(totalGross),sub:"All earnings",icon:<TrendingUp className="w-4 h-4"/>,tc:"text-emerald-600",bc:"bg-emerald-50"},
              {label:"Total deductions",value:fmtINR(totalDed),sub:"PF+ESIC+PT+TDS",icon:<TrendingDown className="w-4 h-4"/>,tc:"text-red-500",bc:"bg-red-50"},
              {label:"Net payable",value:fmtINR(totalNet),sub:"To employees",icon:<IndianRupee className="w-4 h-4"/>,tc:"text-indigo-700",bc:"bg-indigo-50"},
              {label:"Employer liability",value:fmtINR(totalPfEr+totalEsicEr),sub:"PF+ESIC (ER)",icon:<Shield className="w-4 h-4"/>,tc:"text-amber-600",bc:"bg-amber-50"},
            ].map(s=>(
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bc} ${s.tc} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{s.label}</p>
                  <p className="text-base font-bold text-gray-900 leading-tight">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Payslip table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{getMonthName(selectedMonth)} {selectedYear} · {employees.length} employees</h3>
                <p className="text-xs text-gray-400 mt-0.5">Click row to expand · Click values to override</p>
              </div>
              <div className="flex items-center gap-2">
                {existingRun?.status==="completed" && (
                  <button onClick={markAsPaid}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                    <Check className="w-4 h-4"/>Mark as paid
                  </button>
                )}
                {existingRun?.status!=="paid" && (
                  <button onClick={processPayroll} disabled={processing||employees.length===0}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b] disabled:opacity-50 transition-colors">
                    {processing?<><Loader2 className="w-4 h-4 animate-spin"/>Processing...</>:<><Zap className="w-4 h-4"/>{existingRun?"Re-process":"Process payroll"}</>}
                  </button>
                )}
              </div>
            </div>

            {loading?(
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin"/>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            ):employees.length===0?(
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Users className="w-8 h-8 text-gray-300"/>
                <p className="text-sm text-gray-500">No active employees found</p>
              </div>
            ):(
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {["Employee","Days","Gross","PF (EE)","ESIC","PT","TDS","Bonus","Net payable",""].map(h=>(
                          <th key={h} className={`text-xs font-semibold text-gray-500 px-3 py-3 ${h==="Employee"?"text-left px-4":h==="Net payable"?"text-right text-indigo-600":"text-right"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payslips.map(row => (
                        <Fragment key={row.employee.id}>
                          <tr className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={()=>setExpandedRow(expandedRow===row.employee.id?null:row.employee.id)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(row.employee.full_name)}`}>
                                  {getInitials(row.employee.full_name)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{row.employee.full_name}</p>
                                  <p className="text-xs text-gray-400">{row.employee.employee_code} · {row.employee.department}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right" onClick={e=>e.stopPropagation()}>
                              <OverrideCell value={row.override_days_present} prefix="" onChange={v=>updatePayslip(row.employee.id,"override_days_present",Math.min(v,workingDays))}/>
                              <span className="text-xs text-gray-400">/{workingDays}</span>
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-mono text-gray-700">{fmtINR(row.gross_earned)}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{row.pf_employee>0?`-${fmtINR(row.pf_employee)}`:"—"}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{row.esic_employee>0?`-${fmtINR(row.esic_employee)}`:"—"}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{row.pt_amount>0?`-${fmtINR(row.pt_amount)}`:"—"}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-orange-500">{row.tds_amount>0?`-${fmtINR(row.tds_amount)}`:"—"}</td>
                            <td className="px-3 py-3 text-right" onClick={e=>e.stopPropagation()}>
                              <OverrideCell value={row.override_bonus} onChange={v=>updatePayslip(row.employee.id,"override_bonus",v)}/>
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-mono font-bold text-indigo-700">{fmtINR(row.net_payable)}</td>
                            <td className="px-3 py-3 text-right" onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>setPayslipModal(row)} className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors" title="View payslip">
                                <Eye className="w-3.5 h-3.5 text-indigo-500"/>
                              </button>
                            </td>
                          </tr>

                          {expandedRow===row.employee.id && (
                            <tr className="bg-indigo-50/40">
                              <td colSpan={10} className="px-6 py-4">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
                                  <div>
                                    <p className="font-bold text-gray-500 uppercase tracking-wider mb-2">Earnings</p>
                                    {[["Basic",row.basic_earned],["HRA",row.hra_earned],["Special",row.special_allowance_earned],["Other",row.other_allowance_earned],["Bonus",row.bonus]].filter(([,v])=>(v as number)>0).map(([l,v])=>(
                                      <div key={l as string} className="flex justify-between py-0.5"><span className="text-gray-600">{l as string}</span><span className="font-mono text-gray-800">{fmtINR(v as number)}</span></div>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-500 uppercase tracking-wider mb-2">Deductions</p>
                                    {[["PF EE",row.pf_employee],["ESIC EE",row.esic_employee],["PT",row.pt_amount],["TDS",row.tds_amount],["Other",row.other_deductions]].filter(([,v])=>(v as number)>0).map(([l,v])=>(
                                      <div key={l as string} className="flex justify-between py-0.5"><span className="text-gray-600">{l as string}</span><span className="font-mono text-red-600">-{fmtINR(v as number)}</span></div>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-500 uppercase tracking-wider mb-2">Employer cost</p>
                                    {[["PF ER 13%",row.pf_employer],["ESIC ER 3.25%",row.esic_employer]].filter(([,v])=>(v as number)>0).map(([l,v])=>(
                                      <div key={l as string} className="flex justify-between py-0.5"><span className="text-gray-600">{l as string}</span><span className="font-mono text-blue-600">{fmtINR(v as number)}</span></div>
                                    ))}
                                    <div className="flex justify-between py-0.5 pt-1 border-t border-indigo-200 mt-1 font-semibold">
                                      <span className="text-gray-700">Total CTC</span>
                                      <span className="font-mono text-gray-900">{fmtINR(row.gross_earned+row.pf_employer+row.esic_employer)}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-500 uppercase tracking-wider mb-2">Adjustments</p>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">Extra allowance</span><OverrideCell value={row.override_other_allowance} onChange={v=>updatePayslip(row.employee.id,"override_other_allowance",v)}/></div>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">Extra deduction</span><OverrideCell value={row.override_other_deductions} onChange={v=>updatePayslip(row.employee.id,"override_other_deductions",v)}/></div>
                                    <div className="flex justify-between py-1 pt-2 border-t border-indigo-200 mt-1 font-bold">
                                      <span className="text-indigo-700">Net payable</span>
                                      <span className="font-mono text-indigo-700">{fmtINR(row.net_payable)}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="px-4 py-3 text-sm font-bold">{employees.length} employees</td>
                        <td/>
                        <td className="px-3 py-3 text-right text-sm font-mono font-bold">{fmtINR(totalGross)}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{fmtINR(payslips.reduce((a,r)=>a+r.pf_employee,0))}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{fmtINR(payslips.reduce((a,r)=>a+r.esic_employee,0))}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{fmtINR(payslips.reduce((a,r)=>a+r.pt_amount,0))}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-orange-500">{fmtINR(payslips.reduce((a,r)=>a+r.tds_amount,0))}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-emerald-500">{fmtINR(payslips.reduce((a,r)=>a+r.bonus,0))}</td>
                        <td className="px-3 py-3 text-right text-sm font-mono font-bold text-indigo-500">{fmtINR(totalNet)}</td>
                        <td/>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-3">
                  <Shield className="w-4 h-4 text-blue-500 flex-shrink-0"/>
                  <p className="text-xs text-blue-700">
                    Employer deposits due by 15th: PF <strong>{fmtINR(totalPfEr)}</strong> + ESIC <strong>{fmtINR(totalEsicEr)}</strong> = <strong>{fmtINR(totalPfEr+totalEsicEr)}</strong>
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {payslipModal && <PayslipModal row={payslipModal} month={selectedMonth} year={selectedYear} orgName={orgName} onClose={()=>setPayslipModal(null)}/>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
      </div>
      </div>
    </div>
  );
}