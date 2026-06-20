#!/usr/bin/env python3
# Run from repo root (~/hrone):  python3 patch-tasks-ui.py
# Phase 1 Tasks UI: drop List view, insights/left panel closed by default and
# working on mobile (slide-over) with a New task button at its top, dotted board
# background, responsive search. Assert-guarded; won't touch the file on mismatch.

path = "app/(dashboard)/tasks/page.tsx"
s = open(path).read()
orig = s

def repl(old, new, label):
    global s
    assert old in s, f"anchor not found: {label}"
    s = s.replace(old, new, 1)

# 1) ViewMode: drop list
repl('type ViewMode = "board" | "table" | "list";',
     'type ViewMode = "board" | "table";', "ViewMode type")

# 2) left panel closed by default
repl('  const [showPanel, setShowPanel] = useState(true);',
     '  const [showPanel, setShowPanel] = useState(false);', "showPanel default")

# 3) view tabs: drop the List tab
repl('{([["board", "Board", LayoutGrid], ["table", "Table", TableIcon], ["list", "List", ListIcon]] as const).map(([id, label, Icon]) => (',
     '{([["board", "Board", LayoutGrid], ["table", "Table", TableIcon]] as const).map(([id, label, Icon]) => (', "view tabs")

# 4) dotted-grid board background
repl('<div className="flex gap-4 overflow-x-auto pb-3 rounded-2xl p-3 -mx-1 transition-colors" style={{ background: boardBg }}>',
     '<div className="flex gap-4 overflow-x-auto pb-3 rounded-2xl p-3 -mx-1 transition-colors" style={{ backgroundColor: boardBg, backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.06) 1px, transparent 1px)", backgroundSize: "18px 18px" }}>',
     "board background")

# 5) search width responsive (was fixed w-44 -> overflowed mobile)
repl('className="w-44 pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />',
     'className="w-36 md:w-44 pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />',
     "search width")

# 6) views container + aside -> mobile slide-over with a New task button on top
old6 = '''      {/* views */}
      <div className="flex gap-4">
        {showPanel && (
          <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-3">
            {/* insights */}'''
new6 = '''      {/* views */}
      <div className="flex gap-4 relative">
        {showPanel && <div onClick={() => setShowPanel(false)} className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" />}
        {showPanel && (
          <aside className="fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 lg:w-60 shrink-0 flex flex-col gap-3 overflow-y-auto bg-gray-50 lg:bg-transparent p-3 lg:p-0 shadow-2xl lg:shadow-none">
            <div className="flex items-center justify-between lg:hidden">
              <span className="text-sm font-bold text-gray-700">Insights & filters</span>
              <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-200"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <button onClick={() => setShowCreate("todo")} className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm">
              <Plus className="w-4 h-4" />New task
            </button>
            {/* insights */}'''
repl(old6, new6, "views container + aside")

# 7) table/list block -> table only, scrollable on mobile
#    (surgical: condition, wrapper overflow, table min-width; list branch becomes unreachable)
repl('{(view === "table" || view === "list") && (',
     '{view === "table" && (', "table/list condition")
repl('<div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">',
     '<div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">',
     "table wrapper overflow")
repl('<table className="w-full text-sm">',
     '<table className="w-full text-sm" style={{ minWidth: "640px" }}>',
     "table min-width")

assert s != orig, "no changes applied"
open(path, "w").write(s)
print("patched", path)
