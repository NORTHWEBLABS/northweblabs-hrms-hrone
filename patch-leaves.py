#!/usr/bin/env python3
# Run from repo root (~/hrone):  python3 patch-leaves.py
# Makes app/(dashboard)/leaves/page.tsx count working days from the work-schedule
# policy (employee override -> org default -> fallback) instead of hardcoding weekends.

path = "app/(dashboard)/leaves/page.tsx"
s = open(path).read()
orig = s

# 1) import the schedule helpers
anchor = 'import { cn } from "@/lib/utils";'
assert anchor in s, "anchor 1 (cn import) not found"
s = s.replace(
    anchor,
    anchor + '\nimport { fetchWorkingDays, workingDaysBetween, DEFAULT_WORKING_DAYS } from "@/lib/schedule";',
    1,
)

# 2) remove the weekend-hardcoded calcDays helper
calc = '''function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const f = new Date(from), t = new Date(to);
  if (t < f) return 0;
  let days = 0;
  const d = new Date(f);
  while (d <= t) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
    d.setDate(d.getDate() + 1);
  }
  return days;
}

'''
assert calc in s, "anchor 2 (calcDays) not found"
s = s.replace(calc, "", 1)

# 3) modal: load the selected employee's working days + count against them
block_old = '''  const [errors, setErrors] = useState<Record<string,string>>({});

  const fromDateStr = fromDate ? format(fromDate, "yyyy-MM-dd") : "";
  const toDateStr   = toDate   ? format(toDate,   "yyyy-MM-dd") : "";
  const days = useMemo(() => calcDays(fromDateStr, toDateStr), [fromDateStr, toDateStr]);'''
block_new = '''  const [errors, setErrors] = useState<Record<string,string>>({});
  const [workingDays, setWorkingDays] = useState<number[]>(DEFAULT_WORKING_DAYS);

  // Resolve the selected employee's working-day policy: override -> org default -> fallback
  useEffect(() => {
    let active = true;
    if (!empId || !orgId) { setWorkingDays(DEFAULT_WORKING_DAYS); return; }
    fetchWorkingDays(supabase, orgId, empId).then(wd => { if (active) setWorkingDays(wd); });
    return () => { active = false; };
  }, [empId, orgId, supabase]);

  const fromDateStr = fromDate ? format(fromDate, "yyyy-MM-dd") : "";
  const toDateStr   = toDate   ? format(toDate,   "yyyy-MM-dd") : "";
  const days = useMemo(
    () => (fromDate && toDate && toDate >= fromDate ? workingDaysBetween(fromDate, toDate, workingDays) : 0),
    [fromDate, toDate, workingDays]
  );'''
assert block_old in s, "anchor 3 (modal days block) not found"
s = s.replace(block_old, block_new, 1)

# 4) fix the now-inaccurate subtitle
sub_old = '<p className="text-xs text-gray-400 mt-0.5">Working days only (excludes weekends)</p>'
sub_new = '<p className="text-xs text-gray-400 mt-0.5">Working days only (per work schedule)</p>'
assert sub_old in s, "anchor 4 (subtitle) not found"
s = s.replace(sub_old, sub_new, 1)

assert s != orig, "no changes applied"
open(path, "w").write(s)
print("patched", path)
