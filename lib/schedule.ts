// lib/schedule.ts — work-week / weekly-off policy helpers.
// Weekday numbering is ISO throughout: Mon=1 … Sun=7.

export const WEEKDAYS: { iso: number; short: string; label: string }[] = [
  { iso: 1, short: "Mon", label: "Monday" },
  { iso: 2, short: "Tue", label: "Tuesday" },
  { iso: 3, short: "Wed", label: "Wednesday" },
  { iso: 4, short: "Thu", label: "Thursday" },
  { iso: 5, short: "Fri", label: "Friday" },
  { iso: 6, short: "Sat", label: "Saturday" },
  { iso: 7, short: "Sun", label: "Sunday" },
];

// Default when no policy is configured: Mon–Sat working, Sunday off (common Indian 6-day week).
export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];

// JS getDay() is Sun=0..Sat=6 — convert to ISO Mon=1..Sun=7.
export const isoDow = (d: Date): number => {
  const x = d.getDay();
  return x === 0 ? 7 : x;
};

// Local YYYY-MM-DD — avoids the UTC shift that toISOString() introduces for IST users.
export const isoLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const isWorkingDay = (dow: number, workingDays: number[]) => workingDays.includes(dow);
export const isWeeklyOff = (dow: number, workingDays: number[]) => !workingDays.includes(dow);

// Count scheduled working days between two dates (inclusive).
export const workingDaysBetween = (from: Date, to: Date, workingDays: number[]): number => {
  let n = 0;
  const c = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (c <= end) {
    if (workingDays.includes(isoDow(c))) n++;
    c.setDate(c.getDate() + 1);
  }
  return n;
};

export const scheduleSummary = (workingDays: number[]): string => {
  const off = WEEKDAYS.filter((w) => !workingDays.includes(w.iso)).map((w) => w.short);
  const n = workingDays.length;
  if (off.length === 0) return `${n}-day week · no weekly off`;
  return `${n}-day week · ${off.join(", ")} off`;
};

export interface WorkSchedule {
  id: string;
  org_id: string;
  name: string;
  working_days: number[];
  is_default: boolean;
}

// Resolve an employee's working weekdays: per-employee assignment (override) → org default → fallback.
// Best-effort: if the tables don't exist yet or RLS blocks the read, returns DEFAULT_WORKING_DAYS,
// so callers (e.g. the employee dashboard) keep working before the migration is applied.
export async function fetchWorkingDays(
  sb: any,
  orgId: string,
  employeeId: string
): Promise<number[]> {
  if (!orgId) return DEFAULT_WORKING_DAYS;
  try {
    let scheduleId: string | null = null;
    if (employeeId) {
      const { data: assign } = await sb
        .from("employee_work_schedule")
        .select("schedule_id")
        .eq("employee_id", employeeId)
        .maybeSingle();
      scheduleId = assign?.schedule_id || null;
    }
    if (scheduleId) {
      const { data: sch } = await sb
        .from("work_schedules")
        .select("working_days")
        .eq("id", scheduleId)
        .maybeSingle();
      if (sch?.working_days?.length) return sch.working_days as number[];
    }
    const { data: def } = await sb
      .from("work_schedules")
      .select("working_days")
      .eq("org_id", orgId)
      .eq("is_default", true)
      .maybeSingle();
    if (def?.working_days?.length) return def.working_days as number[];
  } catch {
    // tables absent / RLS — fall through to default
  }
  return DEFAULT_WORKING_DAYS;
}
