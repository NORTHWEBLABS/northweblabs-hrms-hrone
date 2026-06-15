"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  IndianRupee, Check, X, ChevronDown,
  Download, Eye, Loader2, AlertCircle, CheckCircle2,
  Users, TrendingUp, TrendingDown, RefreshCw,
  Zap, Clock, Building2, Shield, SlidersHorizontal, Info, Pencil,
} from "lucide-react";

// --- Supabase ---
function useSupabase() {
  return useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
}

// --- Types ---
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
  leave_days: number;
  calendar_days: number;
  lop_days: number;
  lop_days_waived: number;
  lop_amount: number;
  goodwill_amount: number;
  goodwill_note: string | null;
  loan_recovery: number;          // total deducted this month across all active loans
  loan_installment: number;       // sum of suggested installments
  loan_outstanding: number;       // sum of outstanding balances
  loan_lines: { id: string; installment: number; outstanding: number }[]; // per-loan for ledger split
  override_bonus: number;
  override_other_deductions: number;
  override_other_allowance: number;
  override_days_present: number;
  override_lop_waived: number;
  override_loan_recovery: number;
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

// --- Payroll Engine ---
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

function calcPayslip(
  emp: Employee, daysPresent: number, leaveDays: number, workingDays: number,
  calendarDays: number, month: number, bonus: number, otherDed: number,
  otherAllow: number, lopWaivedDays: number,
  loanRecovery: number, loanInstallment: number, loanOutstanding: number,
  loanLines: { id: string; installment: number; outstanding: number }[]
): PayslipRow {
  const basicFull = emp.basic_salary;
  const hraFull = emp.hra;
  const specialFull = emp.special_allowance;
  const otherFull = emp.other_allowance + otherAllow;
  const grossFull = basicFull + hraFull + specialFull + otherFull;

  // LOP: working days not covered by presence or approved leave
  const paidPresent = daysPresent + leaveDays;
  const rawLopDays = Math.max(0, workingDays - paidPresent);
  const waived = Math.min(lopWaivedDays, rawLopDays);
  const netLopDays = Math.max(0, rawLopDays - waived);

  const perDay = calendarDays > 0 ? grossFull / calendarDays : 0;
  const lopAmount = Math.round(netLopDays * perDay);
  const goodwillAmount = Math.round(waived * perDay);

  const grossEarned = Math.round(grossFull - lopAmount) + bonus;
  const earnedRatio = grossFull > 0 ? (grossFull - lopAmount) / grossFull : 1;
  const basicEarned = Math.round(basicFull * earnedRatio);
  const hraEarned = Math.round(hraFull * earnedRatio);
  const specialEarned = Math.round(specialFull * earnedRatio);
  const otherEarned = Math.round(otherFull * earnedRatio);

  const pfBase = Math.min(basicEarned, 15000);
  const pfEmployee = emp.pf_applicable ? Math.round(pfBase * 0.12) : 0;
  const pfEmployer = emp.pf_applicable ? Math.round(pfBase * 0.13) : 0;
  const esicEmployee = emp.esic_applicable && grossEarned <= 21000 ? Math.round(grossEarned * 0.0075) : 0;
  const esicEmployer = emp.esic_applicable && grossEarned <= 21000 ? Math.round(grossEarned * 0.0325) : 0;
  const ptAmount = emp.pt_applicable ? PT_MAHARASHTRA(grossEarned, month) : 0;
  const tdsAmount = TDS_NEW_REGIME(grossEarned * 12);
  const totalDeductions = pfEmployee + esicEmployee + ptAmount + tdsAmount + otherDed + loanRecovery;

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
    leave_days: leaveDays, calendar_days: calendarDays,
    lop_days: rawLopDays, lop_days_waived: waived, lop_amount: lopAmount,
    goodwill_amount: goodwillAmount,
    goodwill_note: waived > 0 ? `${waived} of ${rawLopDays} LOP day${rawLopDays > 1 ? "s" : ""} waived (good-will)` : null,
    loan_recovery: loanRecovery, loan_installment: loanInstallment,
    loan_outstanding: loanOutstanding, loan_lines: loanLines,
    override_bonus: bonus, override_other_deductions: otherDed,
    override_other_allowance: otherAllow, override_days_present: daysPresent,
    override_lop_waived: lopWaivedDays,
    override_loan_recovery: loanRecovery,
  };
}

// --- Helpers ---
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

function getCalendarDays(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const getInitials = (name: string) => name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
const avatarColor = (name: string) => {
  const c = ["bg-indigo-100 text-indigo-700","bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-purple-100 text-purple-700"];
  return c[name.charCodeAt(0) % c.length];
};

// --- Toast ---
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

// --- Payslip Modal ---
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

  const netLopDays = row.lop_days - row.lop_days_waived;
  const grossFullApprox = row.basic_earned + row.hra_earned + row.special_allowance_earned + row.other_allowance_earned + row.lop_amount;
  const perDayApprox = row.calendar_days > 0 ? Math.round(grossFullApprox / row.calendar_days) : 0;

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
              <p className="text-xs text-white/50">{row.employee.designation} - {row.employee.department}</p>
              <p className="text-xs text-white/40 mt-0.5 font-mono">{row.employee.employee_code}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">Pay period</p>
              <p className="text-sm font-semibold">{getMonthName(month)} {year}</p>
              <p className="text-xs text-white/50">{row.days_present} present + {row.leave_days} leave / {row.working_days} working</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 max-h-[55vh] overflow-y-auto">
          <Section title="Earnings (full)" variant="earn" rows={[
            ["Basic salary", row.basic_earned], ["HRA", row.hra_earned],
            ["Special allowance", row.special_allowance_earned], ["Other allowance", row.other_allowance_earned],
            ["Bonus", row.bonus],
          ]}/>

          {row.lop_amount > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm">
              <span className="text-red-700">Loss of pay ({netLopDays} day{netLopDays !== 1 ? "s" : ""} @ {fmtINR(perDayApprox)}/day)</span>
              <span className="font-mono text-red-600">-{fmtINR(row.lop_amount)}</span>
            </div>
          )}
          {row.goodwill_amount > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
              <span className="text-emerald-700">Good-will adjustment <span className="text-xs text-emerald-500 block">{row.goodwill_note}</span></span>
              <span className="font-mono text-emerald-600">+{fmtINR(row.goodwill_amount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold">
            <span className="text-emerald-800">Gross earned</span>
            <span className="font-mono text-emerald-900">{fmtINR(row.gross_earned)}</span>
          </div>
          <Section title="Deductions" variant="ded" rows={[
            ["PF (Employee 12%)", row.pf_employee], ["ESIC (Employee 0.75%)", row.esic_employee],
            ["Professional Tax", row.pt_amount], ["TDS", row.tds_amount],
            ["Loan / advance recovery", row.loan_recovery], ["Other deductions", row.other_deductions],
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
                <p className="text-xs text-gray-400 font-mono">A/C ****{row.employee.bank_account.slice(-4)} - {row.employee.bank_ifsc}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">Computer-generated salary slip - {getMonthName(month)} {year}</p>
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

// --- Override Cell ---
// --- Adjustments Modal: all overridable fields for one employee in one place ---
// Each field shows its computed/expected value and a contextual message when the
// admin's input differs (higher or lower). Replaces the old inline OverrideCell.
// Stable top-level field component (must NOT be defined inside AdjustmentsModal,
// or the input loses focus on every keystroke due to remount).
function AdjField({
  label, value, setValue, computed, computedLabel, max, messageFor,
}: {
  label: string; value: number; setValue: (n:number)=>void;
  computed: number; computedLabel: string; max?: number;
  messageFor: (v:number) => { tone: "info"|"warn"|"ok"; text: string } | null;
}) {
  const msg = messageFor(value);
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Pencil className="w-3 h-3 text-indigo-400" />
          <span className="text-xs font-semibold text-gray-700">{label}</span>
          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-wide">editable</span>
        </div>
        <span className="text-[11px] text-gray-400">{computedLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-mono">₹</span>
        <input
          type="text" inputMode="numeric" value={String(value)}
          onChange={e => { const digits = e.target.value.replace(/[^0-9]/g, ""); let v = Number(digits)||0; if (max!=null) v = Math.min(v, max); setValue(v); }}
          className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg font-mono text-right focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        {value !== computed && (
          <button onClick={()=>setValue(computed)} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium whitespace-nowrap">reset</button>
        )}
      </div>
      {msg && (
        <div className={`mt-2 flex items-start gap-1.5 text-[11px] rounded-lg px-2 py-1.5 ${
          msg.tone==="warn" ? "bg-amber-50 text-amber-700" :
          msg.tone==="ok" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}

function AdjustmentsModal({
  row, workingDays, calendarDays, onApply, onClose,
}: {
  row: PayslipRow; workingDays: number; calendarDays: number;
  onApply: (vals: { bonus:number; otherAllow:number; otherDed:number; lopWaived:number; loanRecovery:number }) => void;
  onClose: () => void;
}) {
  const [bonus, setBonus] = useState(row.override_bonus);
  const [otherAllow, setOtherAllow] = useState(row.override_other_allowance);
  const [otherDed, setOtherDed] = useState(row.override_other_deductions);
  const [lopWaived, setLopWaived] = useState(row.override_lop_waived);
  const [loanRecovery, setLoanRecovery] = useState(row.override_loan_recovery);

  const perDay = calendarDays > 0
    ? Math.round((row.basic_earned + row.hra_earned + row.special_allowance_earned + row.other_allowance_earned + row.lop_amount) / calendarDays)
    : 0;

  // A single editable field block: label, computed hint, input, and a diff message.
  const apply = () => onApply({ bonus, otherAllow, otherDed, lopWaived, loanRecovery });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            <div>
              <h2 className="text-base font-bold text-gray-900">Adjustments</h2>
              <p className="text-xs text-gray-400">{row.employee.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400"/></button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <AdjField
            label="Bonus" value={bonus} setValue={setBonus} computed={0} computedLabel="Default ₹0"
            messageFor={v => v>0 ? { tone:"ok", text:`Adds ${fmtINR(v)} to gross earnings this month.` } : null}
          />
          <AdjField
            label="Extra allowance" value={otherAllow} setValue={setOtherAllow} computed={0} computedLabel="Default ₹0"
            messageFor={v => v>0 ? { tone:"ok", text:`${fmtINR(v)} added on top of standard allowances.` } : null}
          />
          <AdjField
            label="Extra deduction" value={otherDed} setValue={setOtherDed} computed={0} computedLabel="Default ₹0"
            messageFor={v => v>0 ? { tone:"warn", text:`${fmtINR(v)} additional deduction beyond statutory.` } : null}
          />

          {row.lop_days > 0 && (
            <AdjField
              label="LOP days waived (good-will)" value={lopWaived} setValue={setLopWaived}
              computed={0} computedLabel={`${row.lop_days} LOP day(s) · ${fmtINR(perDay)}/day`} max={row.lop_days}
              messageFor={v => {
                if (v<=0) return { tone:"info", text:`Full LOP of ${fmtINR(row.lop_amount + row.goodwill_amount)} applies (${row.lop_days} days). Waive days to forgive as good-will.` };
                if (v>=row.lop_days) return { tone:"ok", text:`All ${row.lop_days} LOP day(s) waived — no loss-of-pay deduction this month.` };
                return { tone:"ok", text:`${v} of ${row.lop_days} day(s) waived (+${fmtINR(Math.round(v*perDay))} good-will); ${row.lop_days-v} day(s) still deducted.` };
              }}
            />
          )}

          {row.loan_outstanding > 0 && (
            <AdjField
              label="Loan / advance recovery" value={loanRecovery} setValue={setLoanRecovery}
              computed={Math.min(row.loan_installment, row.loan_outstanding)}
              computedLabel={`${fmtINR(row.loan_installment)}/mo · ${fmtINR(row.loan_outstanding)} outstanding`} max={row.loan_outstanding}
              messageFor={v => {
                const inst = Math.min(row.loan_installment, row.loan_outstanding);
                if (v===inst) return { tone:"info", text:`Standard installment. ${fmtINR(row.loan_outstanding - v)} will remain outstanding.` };
                if (v>inst) {
                  const months = row.loan_installment>0 ? Math.round(v/row.loan_installment*10)/10 : 0;
                  if (v>=row.loan_outstanding) return { tone:"warn", text:`Recovers the FULL outstanding ${fmtINR(row.loan_outstanding)} this month — loan will close.` };
                  return { tone:"warn", text:`Above installment — recovering ≈${months} months at once. ${fmtINR(row.loan_outstanding - v)} left after.` };
                }
                return { tone:"info", text:`Below installment — only ${fmtINR(v)} recovered, ${fmtINR(row.loan_outstanding - v)} carries forward.` };
              }}
            />
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={apply} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
            <Check className="w-4 h-4"/>Apply adjustments
          </button>
        </div>
      </div>
    </div>
  );
}

// Small read-only value display for the expanded row (replaces editable cells there)
function ValDisplay({ value, prefix="₹", muted=false }: { value:number; prefix?:string; muted?:boolean }) {
  return <span className={`text-xs font-mono ${muted?"text-gray-400":"text-gray-700"}`}>{value>0?`${prefix}${value.toLocaleString("en-IN")}`:"—"}</span>;
}

// --- Main Page ---
export default function PayrollPage() {
  const supabase = useSupabase();
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("Your Company");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [existingRun, setExistingRun] = useState<PayrollRun | null>(null);
  const [pastRuns, setPastRuns] = useState<PayrollRun[]>([]);
  const [view, setView] = useState<"run"|"history">("run");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string|null>(null);
  const [payslipModal, setPayslipModal] = useState<PayslipRow|null>(null);
  const [adjustModal, setAdjustModal] = useState<PayslipRow|null>(null);
  const [toast, setToast] = useState<{message:string;type:"success"|"error"}|null>(null);
  const [unmarkedPresent, setUnmarkedPresent] = useState(true); // safety: unmarked working days = present

  const workingDays = useMemo(() => getWorkingDays(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const calendarDays = useMemo(() => getCalendarDays(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  const resolveOrg = useCallback(async (): Promise<string> => {
    if (orgId) return orgId;
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("activeOrgId");
      if (s) { setOrgId(s); return s; }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: ud } = await supabase.from("users").select("org_id").eq("id", user.id).maybeSingle();
      if (ud?.org_id) { setOrgId(ud.org_id); return ud.org_id; }
    }
    const { data: f } = await supabase.from("organizations").select("id,name").order("created_at").limit(1).maybeSingle();
    if (f?.id) { setOrgId(f.id); if (f.name) setOrgName(f.name); return f.id; }
    return "";
  }, [orgId, supabase]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const oid = await resolveOrg();
      if (!oid) { setLoading(false); return; }

      const { data: org } = await supabase.from("organizations").select("name").eq("id", oid).maybeSingle();
      if (org?.name) setOrgName(org.name);

      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2,"0")}-01`;
      const monthEnd = `${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(getCalendarDays(selectedYear, selectedMonth)).padStart(2,"0")}`;

      const [{ data: emps }, { data: run }, { data: att }, { data: past }, { data: lvs }, { data: lns }] = await Promise.all([
        supabase.from("employees").select("id,full_name,employee_code,department,designation,basic_salary,hra,special_allowance,other_allowance,gross_salary,pf_applicable,esic_applicable,pt_applicable,salary_type,bank_name,bank_account,bank_ifsc")
          .eq("org_id", oid).eq("status","active").order("full_name"),
        supabase.from("payroll_runs").select("*").eq("org_id", oid).eq("month", selectedMonth).eq("year", selectedYear).maybeSingle(),
        supabase.from("attendance").select("employee_id,status,date").eq("org_id", oid).gte("date", monthStart).lte("date", monthEnd),
        supabase.from("payroll_runs").select("*").eq("org_id", oid).order("year",{ascending:false}).order("month",{ascending:false}).limit(12),
        supabase.from("leaves").select("employee_id,from_date,to_date,days,status").eq("org_id", oid).eq("status","approved")
          .lte("from_date", monthEnd).gte("to_date", monthStart),
        supabase.from("loans").select("id,employee_id,installment,total_recoverable,recovered,start_month,start_year,status")
          .eq("org_id", oid).eq("status","active"),
      ]);

      // Present-equivalent days + explicit absent count
      const presenceMap: Record<string,number> = {};
      const absentMap: Record<string,number> = {};
      (att??[]).forEach((a:{employee_id:string;status:string}) => {
        if (a.status==="present"||a.status==="late"||a.status==="wfh") presenceMap[a.employee_id]=(presenceMap[a.employee_id]??0)+1;
        else if (a.status==="half_day") presenceMap[a.employee_id]=(presenceMap[a.employee_id]??0)+0.5;
        else if (a.status==="absent") absentMap[a.employee_id]=(absentMap[a.employee_id]??0)+1;
      });

      // Approved-leave working days within month
      const leaveMap: Record<string,number> = {};
      (lvs??[]).forEach((l:{employee_id:string;from_date:string;to_date:string}) => {
        const start = new Date(Math.max(new Date(l.from_date).getTime(), new Date(monthStart).getTime()));
        const end = new Date(Math.min(new Date(l.to_date).getTime(), new Date(monthEnd).getTime()));
        let d = 0; const c = new Date(start);
        while (c <= end) { if (c.getDay() !== 0 && c.getDay() !== 6) d++; c.setDate(c.getDate()+1); }
        leaveMap[l.employee_id] = (leaveMap[l.employee_id] ?? 0) + d;
      });

      // Active loans per employee whose recovery has started and still has balance
      const loanMap: Record<string, { id: string; installment: number; outstanding: number }[]> = {};
      (lns??[]).forEach((l:any) => {
        const started = (l.start_year < selectedYear) || (l.start_year===selectedYear && l.start_month <= selectedMonth);
        const outstanding = (l.total_recoverable||0) - (l.recovered||0);
        if (started && outstanding > 0) {
          (loanMap[l.employee_id] ||= []).push({ id: l.id, installment: l.installment||0, outstanding });
        }
      });

      setEmployees((emps??[]) as Employee[]);
      setExistingRun(run as PayrollRun|null);
      setPastRuns((past??[]) as PayrollRun[]);

      const wd = getWorkingDays(selectedYear, selectedMonth);
      const cd = getCalendarDays(selectedYear, selectedMonth);
      setPayslips((emps??[]).map(emp => {
        const present = presenceMap[emp.id] ?? 0;
        const leave = leaveMap[emp.id] ?? 0;
        const absent = absentMap[emp.id] ?? 0;
        const effectivePresent = unmarkedPresent
          ? Math.max(0, wd - absent - leave)
          : present;
        const lines = loanMap[emp.id] || [];
        // Suggested recovery per loan = min(installment, outstanding); total summed across loans
        const perLoan = lines.map(l => ({ ...l, suggested: Math.min(l.installment, l.outstanding) }));
        const loanRecovery = perLoan.reduce((a,l)=>a+l.suggested,0);
        const loanInstallment = lines.reduce((a,l)=>a+l.installment,0);
        const loanOutstanding = lines.reduce((a,l)=>a+l.outstanding,0);
        return calcPayslip(emp as Employee, effectivePresent, leave, wd, cd, selectedMonth, 0, 0, 0, 0,
          loanRecovery, loanInstallment, loanOutstanding, lines);
      }));
    } catch (err) {
      console.error(err);
      setToast({message:"Failed to load payroll data",type:"error"});
    } finally {
      setLoading(false);
    }
  }, [resolveOrg, supabase, selectedMonth, selectedYear, unmarkedPresent]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const h = () => { setOrgId(""); fetchData(); };
    window.addEventListener("orgSwitch", h);
    return () => window.removeEventListener("orgSwitch", h);
  }, [fetchData]);

  // Apply all overrides from the Adjustments modal in one recompute
  const applyAdjustments = (empId: string, vals: { bonus:number; otherAllow:number; otherDed:number; lopWaived:number; loanRecovery:number }) => {
    setPayslips(prev => prev.map(row => {
      if (row.employee.id !== empId) return row;
      const lr = Math.min(vals.loanRecovery, row.loan_outstanding);
      const wv = Math.min(vals.lopWaived, row.lop_days);
      return calcPayslip(row.employee, row.override_days_present, row.leave_days, workingDays, calendarDays, selectedMonth,
        vals.bonus, vals.otherDed, vals.otherAllow, wv, lr, row.loan_installment, row.loan_outstanding, row.loan_lines);
    }));
    setAdjustModal(null);
  };

  const processPayroll = async () => {
    setProcessing(true);
    try {
      const oid = await resolveOrg();
      if (!oid) throw new Error("No organization");

      const totGross = payslips.reduce((a,r)=>a+r.gross_earned,0);
      const totDed   = payslips.reduce((a,r)=>a+r.total_deductions,0);
      const totNet   = payslips.reduce((a,r)=>a+r.net_payable,0);
      const totPfEr  = payslips.reduce((a,r)=>a+r.pf_employer,0);
      const totEsEr  = payslips.reduce((a,r)=>a+r.esic_employer,0);

      let runId = existingRun?.id;
      const runPayload = { status:"completed" as const, total_gross:totGross, total_deductions:totDed, total_net:totNet, total_pf_employer:totPfEr, total_esic_employer:totEsEr, processed_at:new Date().toISOString() };

      if (!runId) {
        const { data:nr, error:re } = await supabase.from("payroll_runs").insert({ org_id:oid, month:selectedMonth, year:selectedYear, ...runPayload }).select().single();
        if (re) throw re;
        runId = nr.id;
      } else {
        await supabase.from("payroll_runs").update(runPayload).eq("id", runId);
        await supabase.from("payslips").delete().eq("payroll_run_id", runId);
      }

      const { error:se } = await supabase.from("payslips").insert(payslips.map(r => ({
        org_id:oid, payroll_run_id:runId, employee_id:r.employee.id,
        month:selectedMonth, year:selectedYear,
        working_days:r.working_days, days_present:r.days_present,
        days_absent: Math.max(0, r.working_days - r.days_present - r.leave_days),
        calendar_days:r.calendar_days, leave_days:r.leave_days,
        lop_days:r.lop_days, lop_days_waived:r.lop_days_waived, lop_amount:r.lop_amount,
        goodwill_amount:r.goodwill_amount, goodwill_note:r.goodwill_note,
        basic_earned:r.basic_earned, hra_earned:r.hra_earned,
        special_allowance_earned:r.special_allowance_earned, other_allowance_earned:r.other_allowance_earned,
        gross_earned:r.gross_earned, bonus:r.bonus,
        pf_employee:r.pf_employee, esic_employee:r.esic_employee,
        pt_amount:r.pt_amount, tds_amount:r.tds_amount,
        other_deductions:r.other_deductions, total_deductions:r.total_deductions,
        net_payable:r.net_payable, pf_employer:r.pf_employer, esic_employer:r.esic_employer,
        loan_recovery:r.loan_recovery,
      })));
      if (se) throw se;

      // ── Loan recovery ledger ──────────────────────────────────────────────
      // For each employee, split this month's total recovery across their active loans
      // proportionally to each loan's suggested amount, then upsert ledger + recompute balance.
      for (const r of payslips) {
        if (r.loan_recovery <= 0 || r.loan_lines.length === 0) continue;
        const suggestedTotal = r.loan_lines.reduce((a,l)=>a+Math.min(l.installment,l.outstanding),0);
        let remaining = r.loan_recovery;
        for (let i = 0; i < r.loan_lines.length; i++) {
          const l = r.loan_lines[i];
          const suggested = Math.min(l.installment, l.outstanding);
          // proportional split; last loan absorbs any rounding remainder
          let portion = i === r.loan_lines.length - 1
            ? remaining
            : (suggestedTotal > 0 ? Math.round(r.loan_recovery * (suggested / suggestedTotal)) : 0);
          portion = Math.min(portion, l.outstanding, remaining);
          remaining -= portion;
          if (portion <= 0) continue;
          const balanceAfter = Math.max(0, l.outstanding - portion);
          await supabase.from("loan_repayments").upsert({
            loan_id: l.id, org_id: oid, employee_id: r.employee.id,
            payroll_run_id: runId, month: selectedMonth, year: selectedYear,
            amount: portion, balance_after: balanceAfter,
          }, { onConflict: "loan_id,month,year" });
          // Recompute recovered from full ledger (correct on re-process)
          const { data: led } = await supabase.from("loan_repayments").select("amount").eq("loan_id", l.id);
          const recovered = (led||[]).reduce((a:number,x:any)=>a+(Number(x.amount)||0),0);
          const { data: loanRow } = await supabase.from("loans").select("total_recoverable").eq("id", l.id).maybeSingle();
          const upd: any = { recovered };
          if (loanRow && recovered >= (loanRow.total_recoverable||0)) upd.status = "closed";
          await supabase.from("loans").update(upd).eq("id", l.id);
        }
      }

      setToast({message:`Payroll processed for ${payslips.length} employees`,type:"success"});
      fetchData();
    } catch (err:unknown) {
      setToast({message:err instanceof Error?err.message:"Failed to process",type:"error"});
    } finally { setProcessing(false); }
  };

  const markAsPaid = async () => {
    if (!existingRun?.id) return;
    const { error } = await supabase.from("payroll_runs").update({status:"paid",paid_at:new Date().toISOString()}).eq("id",existingRun.id);
    if (error) { setToast({message:error.message,type:"error"}); return; }
    setToast({message:"Payroll marked as paid",type:"success"});
    fetchData();
  };

  const totalGross = payslips.reduce((a,r)=>a+r.gross_earned,0);
  const totalDed   = payslips.reduce((a,r)=>a+r.total_deductions,0);
  const totalNet   = payslips.reduce((a,r)=>a+r.net_payable,0);
  const totalPfEr  = payslips.reduce((a,r)=>a+r.pf_employer,0);
  const totalEsicEr= payslips.reduce((a,r)=>a+r.esic_employer,0);
  const totalLop   = payslips.reduce((a,r)=>a+r.lop_amount,0);
  const totalGoodwill = payslips.reduce((a,r)=>a+r.goodwill_amount,0);

  const statusBadge = (s:PayrollRun["status"]) => {
    const map={draft:"bg-gray-100 text-gray-600",processing:"bg-amber-100 text-amber-700",completed:"bg-blue-100 text-blue-700",paid:"bg-emerald-100 text-emerald-700"};
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[s]}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>;
  };

  const years = [now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1];

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Payroll</h1>
          <p className="text-xs text-gray-400 mt-0.5">{orgName} - {getMonthName(selectedMonth)} {selectedYear} - {workingDays} working / {calendarDays} calendar days</p>
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
                      <td className="px-4 py-3 text-xs text-gray-500">{run.processed_at?fmtDate(run.processed_at):"-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{run.paid_at?fmtDate(run.paid_at):"-"}</td>
                      <td className="px-4 py-3">
                        <button onClick={()=>{setSelectedMonth(run.month);setSelectedYear(run.year);setView("run");}}
                          className="text-xs text-indigo-600 hover:underline font-medium">View</button>
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
          {existingRun && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              existingRun.status==="paid"?"bg-emerald-50 border-emerald-200":
              existingRun.status==="completed"?"bg-blue-50 border-blue-200":"bg-amber-50 border-amber-200"}`}>
              {existingRun.status==="paid"
                ?<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0"/>
                :<Clock className="w-4 h-4 text-blue-600 flex-shrink-0"/>}
              <p className="text-sm font-medium text-gray-800 flex-1">
                {existingRun.status==="paid"
                  ?`Payroll paid on ${existingRun.paid_at?fmtDate(existingRun.paid_at):"-"}`
                  :existingRun.status==="completed"
                  ?"Payroll processed. Ready to mark as paid."
                  :"Payroll run in progress"}
              </p>
              {statusBadge(existingRun.status)}
            </div>
          )}

          {/* LOP mode toggle */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={unmarkedPresent} onChange={e=>setUnmarkedPresent(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
              <span className="text-xs font-semibold text-gray-700">Treat unmarked days as present</span>
            </label>
            <span className="text-xs text-gray-400">
              {unmarkedPresent
                ? "Only days explicitly marked absent (and uncovered by leave) become LOP."
                : "Any working day without a present/leave record becomes LOP."}
            </span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              {label:"Employees",value:String(employees.length),sub:"Active",icon:<Users className="w-4 h-4"/>,tc:"text-blue-600",bc:"bg-blue-50"},
              {label:"Total gross",value:fmtINR(totalGross),sub:"After LOP",icon:<TrendingUp className="w-4 h-4"/>,tc:"text-emerald-600",bc:"bg-emerald-50"},
              {label:"LOP deducted",value:fmtINR(totalLop),sub:"Loss of pay",icon:<TrendingDown className="w-4 h-4"/>,tc:"text-red-500",bc:"bg-red-50"},
              {label:"Good-will",value:fmtINR(totalGoodwill),sub:"LOP waived",icon:<CheckCircle2 className="w-4 h-4"/>,tc:"text-emerald-600",bc:"bg-emerald-50"},
              {label:"Net payable",value:fmtINR(totalNet),sub:"To employees",icon:<IndianRupee className="w-4 h-4"/>,tc:"text-indigo-700",bc:"bg-indigo-50"},
              {label:"Employer cost",value:fmtINR(totalPfEr+totalEsicEr),sub:"PF+ESIC (ER)",icon:<Shield className="w-4 h-4"/>,tc:"text-amber-600",bc:"bg-amber-50"},
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
                <h3 className="text-sm font-semibold text-gray-800">{getMonthName(selectedMonth)} {selectedYear} - {employees.length} employees</h3>
                <p className="text-xs text-gray-400 mt-0.5">Click row to expand - click values to override - waive LOP days for good-will</p>
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
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {["Employee","Present","Leave","LOP","Gross","PF","ESIC","PT","TDS","Net payable",""].map(h=>(
                          <th key={h} className={`text-xs font-semibold text-gray-500 px-3 py-3 ${h==="Employee"?"text-left px-4":h==="Net payable"?"text-right text-indigo-600":"text-right"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payslips.map(row => (
                        <>
                          <tr key={row.employee.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={()=>setExpandedRow(expandedRow===row.employee.id?null:row.employee.id)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(row.employee.full_name)}`}>
                                  {getInitials(row.employee.full_name)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{row.employee.full_name}</p>
                                  <p className="text-xs text-gray-400">{row.employee.employee_code} - {row.employee.department}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className="text-sm font-mono text-gray-700">{row.days_present}</span>
                              <span className="text-xs text-gray-400">/{workingDays}</span>
                            </td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-blue-600">{row.leave_days>0?row.leave_days:"-"}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono">
                              {row.lop_days>0 ? (
                                <span className="text-red-500">{row.lop_days - row.lop_days_waived}{row.lop_days_waived>0?<span className="text-emerald-500"> ({row.lop_days_waived}w)</span>:null}</span>
                              ) : "-"}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-mono text-gray-700">{fmtINR(row.gross_earned)}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{row.pf_employee>0?`-${fmtINR(row.pf_employee)}`:"-"}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{row.esic_employee>0?`-${fmtINR(row.esic_employee)}`:"-"}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{row.pt_amount>0?`-${fmtINR(row.pt_amount)}`:"-"}</td>
                            <td className="px-3 py-3 text-right text-xs font-mono text-orange-500">{row.tds_amount>0?`-${fmtINR(row.tds_amount)}`:"-"}</td>
                            <td className="px-3 py-3 text-right text-sm font-mono font-bold text-indigo-700">{fmtINR(row.net_payable)}</td>
                            <td className="px-3 py-3 text-right" onClick={e=>e.stopPropagation()}>
                              <div className="flex items-center gap-1 justify-end">
                                {existingRun?.status!=="paid" && (
                                  <button onClick={()=>setAdjustModal(row)} className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors" title="Adjust (bonus, LOP waive, loan)">
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500"/>
                                  </button>
                                )}
                                <button onClick={()=>setPayslipModal(row)} className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors" title="View payslip">
                                  <Eye className="w-3.5 h-3.5 text-indigo-500"/>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {expandedRow===row.employee.id && (
                            <tr key={`${row.employee.id}-exp`} className="bg-indigo-50/40">
                              <td colSpan={11} className="px-6 py-4">
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
                                    <p className="font-bold text-gray-500 uppercase tracking-wider mb-2">LOP &amp; good-will</p>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">Working days</span><span className="font-mono text-gray-800">{row.working_days}</span></div>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">Present</span><span className="font-mono text-gray-800">{row.days_present}</span></div>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">Approved leave</span><span className="font-mono text-blue-600">{row.leave_days}</span></div>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">LOP days</span><span className="font-mono text-red-500">{row.lop_days}</span></div>
                                    <div className="flex justify-between py-0.5 items-center"><span className="text-gray-600">Waived (good-will)</span><ValDisplay value={row.lop_days_waived} prefix="" muted={row.lop_days_waived===0}/></div>
                                    {row.lop_amount>0 && <div className="flex justify-between py-0.5"><span className="text-red-500">LOP deduction</span><span className="font-mono text-red-500">-{fmtINR(row.lop_amount)}</span></div>}
                                    {row.goodwill_amount>0 && <div className="flex justify-between py-0.5"><span className="text-emerald-600">Good-will add-back</span><span className="font-mono text-emerald-600">+{fmtINR(row.goodwill_amount)}</span></div>}
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-bold text-gray-500 uppercase tracking-wider">Adjustments &amp; employer</p>
                                      {existingRun?.status!=="paid" && (
                                        <button onClick={()=>setAdjustModal(row)} className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                                          <SlidersHorizontal className="w-3 h-3"/>Edit
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">Bonus</span><ValDisplay value={row.bonus} muted={row.bonus===0}/></div>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">Extra allowance</span><ValDisplay value={row.override_other_allowance} muted={row.override_other_allowance===0}/></div>
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">Extra deduction</span><ValDisplay value={row.override_other_deductions} muted={row.override_other_deductions===0}/></div>
                                    {row.loan_outstanding > 0 && <div className="flex justify-between py-0.5"><span className="text-gray-600">Loan recovery <span className="text-xs text-gray-400">({fmtINR(row.loan_installment)}/mo)</span></span><ValDisplay value={row.loan_recovery} muted={row.loan_recovery===0}/></div>}
                                    <div className="flex justify-between py-0.5"><span className="text-gray-600">PF ER</span><span className="font-mono text-blue-600">{fmtINR(row.pf_employer)}</span></div>
                                    <div className="flex justify-between py-1 pt-2 border-t border-indigo-200 mt-1 font-bold"><span className="text-indigo-700">Net payable</span><span className="font-mono text-indigo-700">{fmtINR(row.net_payable)}</span></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="px-4 py-3 text-sm font-bold">{employees.length} employees</td>
                        <td/><td/>
                        <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{totalLop>0?`-${fmtINR(totalLop)}`:"-"}</td>
                        <td className="px-3 py-3 text-right text-sm font-mono font-bold">{fmtINR(totalGross)}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{fmtINR(payslips.reduce((a,r)=>a+r.pf_employee,0))}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{fmtINR(payslips.reduce((a,r)=>a+r.esic_employee,0))}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-red-500">{fmtINR(payslips.reduce((a,r)=>a+r.pt_amount,0))}</td>
                        <td className="px-3 py-3 text-right text-xs font-mono text-orange-500">{fmtINR(payslips.reduce((a,r)=>a+r.tds_amount,0))}</td>
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
      {adjustModal && <AdjustmentsModal row={adjustModal} workingDays={workingDays} calendarDays={calendarDays} onApply={(vals)=>applyAdjustments(adjustModal.employee.id, vals)} onClose={()=>setAdjustModal(null)}/>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}