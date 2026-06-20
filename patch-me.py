#!/usr/bin/env python3
# Run from repo root (~/hrone):  python3 patch-me.py
# Makes app/(employee)/me/page.tsx count leave working-days from the work-schedule
# policy (the employee's resolved schedule) instead of hardcoding Mon-Fri.

path = "app/(employee)/me/page.tsx"
s = open(path).read()
orig = s

# 1) import DEFAULT_WORKING_DAYS alongside the existing schedule helpers
imp_old = 'import { fetchWorkingDays, isoDow, isoLocal } from "@/lib/schedule";'
assert imp_old in s, "anchor 1 (schedule import) not found"
s = s.replace(imp_old, 'import { fetchWorkingDays, isoDow, isoLocal, DEFAULT_WORKING_DAYS } from "@/lib/schedule";', 1)

# 2) add a component-level workingDays state next to the leave modal state
state_anchor = '  const [leaveError, setLeaveError] = useState("");'
assert state_anchor in s, "anchor 2 (leaveError state) not found"
s = s.replace(
    state_anchor,
    state_anchor + '\n  const [workingDays, setWorkingDays] = useState<number[]>(DEFAULT_WORKING_DAYS);',
    1,
)

# 3) count leave days against the schedule instead of hardcoded weekends
mem_old = '''  const leaveDays = useMemo(() => {
    if (!leaveFrom || !leaveTo) return 0;
    const f = new Date(leaveFrom), t = new Date(leaveTo);
    if (t < f) return 0;
    let d = 0; const c = new Date(f);
    while (c <= t) { if (c.getDay() > 0 && c.getDay() < 6) d++; c.setDate(c.getDate() + 1); }
    return d;
  }, [leaveFrom, leaveTo]);'''
mem_new = '''  const leaveDays = useMemo(() => {
    if (!leaveFrom || !leaveTo) return 0;
    const f = new Date(leaveFrom), t = new Date(leaveTo);
    if (t < f) return 0;
    let d = 0; const c = new Date(f);
    while (c <= t) { if (workingDays.includes(isoDow(c))) d++; c.setDate(c.getDate() + 1); }
    return d;
  }, [leaveFrom, leaveTo, workingDays]);'''
assert mem_old in s, "anchor 3 (leaveDays memo) not found"
s = s.replace(mem_old, mem_new, 1)

# 4) push the resolved schedule into state so the memo above uses it
fetch_anchor = '      const workingDays = await fetchWorkingDays(sb, orgId, empId);'
assert fetch_anchor in s, "anchor 4 (fetchWorkingDays in loader) not found"
s = s.replace(
    fetch_anchor,
    fetch_anchor + '\n      setWorkingDays(workingDays);',
    1,
)

assert s != orig, "no changes applied"
open(path, "w").write(s)
print("patched", path)
