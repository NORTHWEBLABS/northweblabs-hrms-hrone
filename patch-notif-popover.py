#!/usr/bin/env python3
# Run from repo root (~/hrone):  python3 patch-notif-popover.py
# Keep the notifications dropdown inside the viewport so it can't overflow the
# right edge (which was creating an app-wide horizontal scroll on mobile).

path = "components/NotificationBell.tsx"
s = open(path).read()
orig = s

repl_pairs = [
  ('<div ref={ref} className="fixed w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100]"',
   '<div ref={ref} className="fixed w-80 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100]"',
   "popover max-width"),
  ('setPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 330) });',
   'setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 330)) });',
   "popover left clamp"),
]
for old, new, label in repl_pairs:
    assert old in s, f"anchor not found: {label}"
    s = s.replace(old, new, 1)

assert s != orig
open(path, "w").write(s)
print("patched", path)
