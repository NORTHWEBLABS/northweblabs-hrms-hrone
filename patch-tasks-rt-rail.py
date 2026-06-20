#!/usr/bin/env python3
# Run from repo root (~/hrone):  python3 patch-tasks-rt-rail.py
# Tasks page: live realtime sync, visible slim left rail, stronger dotted grid,
# remove the -mx-1 that nudges the board past the mobile viewport. Assert-guarded.

path = "app/(dashboard)/tasks/page.tsx"
s = open(path).read()
orig = s

def repl(old, new, label):
    global s
    assert old in s, f"anchor not found: {label}"
    assert s.count(old) == 1, f"anchor not unique ({s.count(old)}x): {label}"
    s = s.replace(old, new, 1)

# 1) realtime subscription right after the initial load effect
repl(
'''    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);''',
'''    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* \u2500\u2500 realtime: reflect task changes from other users without a refresh \u2500\u2500 */
  useEffect(() => {
    if (!orgId) return;
    const ch = sb.channel(`tasks-rt:${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `org_id=eq.${orgId}` },
        (payload: any) => {
          const row = (payload.new || payload.old) as Task;
          if (!row?.id) return;
          setTasks(prev => {
            if (payload.eventType === "DELETE") return prev.filter(t => t.id !== row.id);
            return prev.some(t => t.id === row.id)
              ? prev.map(t => (t.id === row.id ? { ...t, ...row } : t))
              : [row, ...prev];
          });
        })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [orgId, sb]);''',
"realtime effect")

# 2) stronger dotted-grid background
repl(
'style={{ backgroundColor: boardBg, backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.06) 1px, transparent 1px)", backgroundSize: "18px 18px" }}',
'style={{ backgroundColor: boardBg, backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.16) 1.5px, transparent 1.6px)", backgroundSize: "16px 16px" }}',
"dotted background")

# 3) drop -mx-1 (pushes board ~4px past each edge on mobile)
repl(
'<div className="flex gap-4 overflow-x-auto pb-3 rounded-2xl p-3 -mx-1 transition-colors"',
'<div className="flex gap-4 overflow-x-auto pb-3 rounded-2xl p-3 transition-colors"',
"board -mx-1")

# 4) persistent slim rail (New task + insights toggle), content stays collapsed by default
repl(
'''      {/* views */}
      <div className="flex gap-4 relative">
        {showPanel && <div onClick={() => setShowPanel(false)} className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" />}''',
'''      {/* views */}
      <div className="flex gap-3 relative">
        {/* slim rail \u2014 always visible (New task + insights toggle), like the canvas toolbar */}
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm h-fit sticky top-2 shrink-0">
          <button onClick={() => setShowCreate("todo")} title="New task" className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="w-5 h-5" /></button>
          <button onClick={() => setShowPanel(s => !s)} title="Insights & filters" className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${showPanel ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}><BarChart3 className="w-5 h-5" /></button>
        </div>
        {showPanel && <div onClick={() => setShowPanel(false)} className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" />}''',
"persistent rail")

assert s != orig, "no changes applied"
open(path, "w").write(s)
print("patched", path)
