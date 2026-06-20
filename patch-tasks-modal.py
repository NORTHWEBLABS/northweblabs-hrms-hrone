#!/usr/bin/env python3
# Run from repo root (~/hrone):  python3 patch-tasks-modal.py
# Converts the task detail from a right-side drawer to a centered modal.
# All inner content (description, checklist, activity/comment lifecycle with
# timestamps, action footer) is unchanged. Assert-guarded.

path = "app/(dashboard)/tasks/page.tsx"
s = open(path).read()
orig = s

# open wrapper: fragment + backdrop + right-drawer aside  ->  centered modal
open_old = '''  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">'''
open_new = '''  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <aside onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">'''
assert open_old in s, "anchor 1 (drawer open wrapper) not found"
assert open_new not in s, "already patched (modal wrapper present)"
s = s.replace(open_old, open_new, 1)

# close wrapper: </aside></> -> </aside></div>
close_old = '''      </aside>
    </>
  );
}'''
close_new = '''      </aside>
    </div>
  );
}'''
assert close_old in s, "anchor 2 (drawer close wrapper) not found"
s = s.replace(close_old, close_new, 1)

assert s != orig, "no changes applied"
open(path, "w").write(s)
print("patched", path)
