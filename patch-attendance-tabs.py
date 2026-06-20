#!/usr/bin/env python3
# Run from repo root (~/hrone):  python3 patch-attendance-tabs.py
# The 5-tab view switcher overflows mobile width and drags the page sideways.
# Make the bar scroll horizontally within the viewport, and stop tabs from crushing.

path = "app/(dashboard)/attendance/page.tsx"
s = open(path).read()
orig = s

# 1) bar: cap at viewport + scroll instead of forcing page width
bar_old = '<div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">'
assert bar_old in s, "anchor 1 (view switcher bar) not found"
bar_new = '<div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit max-w-full overflow-x-auto">'
s = s.replace(bar_old, bar_new, 1)

# 2) tabs: don't shrink, don't wrap the label
tab_old = 'className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all'
assert tab_old in s, "anchor 2 (tab button class) not found"
tab_new = 'className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 whitespace-nowrap'
s = s.replace(tab_old, tab_new, 1)

assert s != orig, "no changes applied"
open(path, "w").write(s)
print("patched", path)
