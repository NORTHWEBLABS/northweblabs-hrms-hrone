#!/usr/bin/env python3
# Run from repo root (~/hrone):  python3 patch-attendance-mobile.py
# Fixes the floating view-switcher tab bar on both attendance pages.
# Idempotent: safe to run more than once; skips anything already patched.

files = [
    "app/(dashboard)/attendance/page.tsx",
    "app/(dashboard)/my-attendance/page.tsx",
]

bar_old = '<div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">'
bar_new = '<div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit max-w-full overflow-x-auto">'
tab_old = 'className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all'
tab_new = 'className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 whitespace-nowrap'

for path in files:
    try:
        s = open(path).read()
    except FileNotFoundError:
        print("skip (not found):", path)
        continue
    orig = s
    changed = []

    # 1) bar -> cap + scroll
    if bar_new in s:
        pass  # already patched
    elif bar_old in s:
        s = s.replace(bar_old, bar_new, 1)
        changed.append("bar")
    else:
        print("WARN: bar anchor not found in", path)

    # 2) tabs -> no shrink, no wrap
    if tab_new in s:
        pass  # already patched
    elif tab_old in s:
        s = s.replace(tab_old, tab_new, 1)
        changed.append("tabs")
    else:
        print("WARN: tab anchor not found in", path)

    if s != orig:
        open(path, "w").write(s)
        print("patched", path, "->", ", ".join(changed))
    else:
        print("no change (already done):", path)
