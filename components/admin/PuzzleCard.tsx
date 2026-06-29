"use client";

import { useState } from "react";
import { Puzzle as PuzzleIcon, RefreshCw, Eye, Check, Lightbulb } from "lucide-react";
import { PUZZLES } from "@/lib/puzzles";

const randIdx = (not?: number) => {
  if (PUZZLES.length <= 1) return 0;
  let i = Math.floor(Math.random() * PUZZLES.length);
  while (i === not) i = Math.floor(Math.random() * PUZZLES.length);
  return i;
};

export default function PuzzleCard() {
  const [idx, setIdx] = useState(() => randIdx());
  const [reveal, setReveal] = useState(false);
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<null | "right" | "wrong">(null);

  const p = PUZZLES[idx];

  const next = () => { setIdx((cur) => randIdx(cur)); setReveal(false); setGuess(""); setVerdict(null); };
  const check = () => {
    const g = guess.trim().toLowerCase();
    if (!g) return;
    const ans = p.a.toLowerCase();
    const ok = ans.includes(g) || g.includes(ans.replace(/[^a-z0-9 ]/g, "").trim());
    setVerdict(ok ? "right" : "wrong");
    if (ok) setReveal(true);
  };

  return (
    <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PuzzleIcon className="w-5 h-5" />
          <div>
            <p className="text-sm font-bold leading-tight">Bored? Solve a puzzle</p>
            <p className="text-[11px] text-indigo-200">{p.cat} · #{p.id} of {PUZZLES.length}</p>
          </div>
        </div>
        <button onClick={next} title="New puzzle" className="w-8 h-8 grid place-items-center rounded-lg bg-white/15 hover:bg-white/25 transition"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="p-5">
        <p className="text-[15px] font-medium text-slate-800 leading-relaxed min-h-[3.5rem]">{p.q}</p>

        <div className="mt-4 flex gap-2">
          <input
            value={guess}
            onChange={(e) => { setGuess(e.target.value); setVerdict(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") check(); }}
            placeholder="Type your answer…"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
          <button onClick={check} className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" />Check</button>
        </div>

        {verdict === "right" && <p className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" />Nice — that's it!</p>}
        {verdict === "wrong" && <p className="mt-2 text-xs font-semibold text-amber-600 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" />Not quite — try again or reveal.</p>}

        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => setReveal((r) => !r)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{reveal ? "Hide answer" : "Reveal answer"}</button>
          <button onClick={next} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Next</button>
        </div>

        {reveal && (
          <div className="mt-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-400 mb-0.5">Answer</p>
            <p className="text-sm font-medium text-indigo-900">{p.a}</p>
          </div>
        )}
      </div>
    </div>
  );
}
