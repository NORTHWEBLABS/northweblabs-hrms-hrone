"use client";

import { useEffect, useState } from "react";
import {
  Gamepad2, RefreshCw, X, Eye, Check, Lightbulb, Trophy, Crown,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
} from "lucide-react";
import { PUZZLES } from "@/lib/puzzles";

export type Game = "zip" | "queens" | "patch" | "2048" | "lights" | "riddle";
export const GAMES: { key: Game; label: string }[] = [
  { key: "zip", label: "Zip" },
  { key: "queens", label: "Queens" },
  { key: "patch", label: "Patch" },
  { key: "2048", label: "2048" },
  { key: "lights", label: "Lights" },
  { key: "riddle", label: "Riddle" },
];

/* ============================ ZIP ============================ */
function genZip() {
  const n = 5;
  const count = 5 + Math.floor(Math.random() * 2);
  const order: number[] = [];
  const flipRows = Math.random() < 0.5;
  const flipDir = Math.random() < 0.5;
  for (let rr = 0; rr < n; rr++) {
    const r = flipRows ? n - 1 - rr : rr;
    const cols = []; for (let c = 0; c < n; c++) cols.push(c);
    if ((rr % 2 === 1) !== flipDir) cols.reverse();
    for (const c of cols) order.push(r * n + c);
  }
  const total = order.length;
  const numbers: Record<number, number> = {};
  for (let k = 0; k < count; k++) numbers[order[Math.round((k * (total - 1)) / (count - 1))]] = k + 1;
  return { n, numbers, count };
}
export function Zip({ cell = 50 }: { cell?: number }) {
  const [puz, setPuz] = useState(genZip);
  const [path, setPath] = useState<number[]>([]);
  const { n, numbers, count } = puz;
  const CELL = cell, GAP = 6;
  const size = n * CELL + (n - 1) * GAP;
  const rc = (i: number) => ({ r: Math.floor(i / n), c: i % n });
  const center = (i: number) => { const { r, c } = rc(i); return { x: c * (CELL + GAP) + CELL / 2, y: r * (CELL + GAP) + CELL / 2 }; };
  const adjacent = (a: number, b: number) => { const A = rc(a), B = rc(b); return Math.abs(A.r - B.r) + Math.abs(A.c - B.c) === 1; };
  const click = (i: number) => {
    if (path.length === 0) { if (numbers[i] === 1) setPath([i]); return; }
    if (path[path.length - 1] === i) { setPath(path.slice(0, -1)); return; }
    if (path.includes(i) || !adjacent(path[path.length - 1], i)) return;
    const num = numbers[i];
    if (num) {
      const last = path.filter((c) => numbers[c]).map((c) => numbers[c]).pop() || 0;
      if (num !== last + 1) return;
    }
    setPath([...path, i]);
  };
  const seq = path.filter((c) => numbers[c]).map((c) => numbers[c]);
  const won = path.length === n * n && seq.length === count && seq.every((v, i) => v === i + 1);
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-slate-500 mb-3 text-center">Connect <b>1 → {count}</b> in order, filling every square. Tap the tip to undo.</p>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
          {path.length > 1 && <polyline points={path.map((i) => { const p = center(i); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke="#6366f1" strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />}
        </svg>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, ${CELL}px)`, gap: GAP }}>
          {Array.from({ length: n * n }, (_, i) => {
            const num = numbers[i]; const inPath = path.includes(i); const tip = path[path.length - 1] === i;
            return (
              <button key={i} onClick={() => click(i)} className={`relative rounded-xl border font-bold transition ${inPath ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"} ${tip ? "ring-2 ring-indigo-400" : ""}`} style={{ width: CELL, height: CELL }}>
                {num && <span className="absolute inset-0 grid place-items-center"><span className="w-7 h-7 grid place-items-center rounded-full bg-slate-900 text-white text-xs z-10">{num}</span></span>}
              </button>
            );
          })}
        </div>
      </div>
      {won ? <div className="mt-3 flex items-center gap-1.5 text-emerald-600 font-bold text-sm"><Trophy className="w-4 h-4" />Solved!</div> : <p className="mt-3 text-xs text-slate-400">{path.length}/{n * n} filled</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setPath([])} className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Reset</button>
        <button onClick={() => { setPuz(genZip()); setPath([]); }} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />New</button>
      </div>
    </div>
  );
}

/* ============================ QUEENS (patches) ============================ */
const REGION_BG = ["bg-rose-100", "bg-emerald-100", "bg-sky-100", "bg-amber-100", "bg-violet-100", "bg-orange-100", "bg-cyan-100"];
function genQueens() {
  const N = 6;
  const neighbors = (i: number) => { const r = Math.floor(i / N), c = i % N; const o: number[] = []; if (r > 0) o.push(i - N); if (r < N - 1) o.push(i + N); if (c > 0) o.push(i - 1); if (c < N - 1) o.push(i + 1); return o; };
  let col: number[] = [];
  for (let t = 0; t < 3000; t++) {
    const perm = [...Array(N).keys()];
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    let ok = true;
    for (let r = 0; r < N - 1; r++) if (Math.abs(perm[r] - perm[r + 1]) < 2) { ok = false; break; }
    if (ok) { col = perm; break; }
  }
  if (!col.length) col = [...Array(N).keys()];
  const queenCells = col.map((c, r) => r * N + c);
  const region = new Array(N * N).fill(-1);
  queenCells.forEach((cell, id) => (region[cell] = id));
  let remaining = N * N - N, guard = 0;
  while (remaining > 0 && guard++ < 100000) {
    const cands: number[] = [];
    for (let i = 0; i < N * N; i++) if (region[i] === -1 && neighbors(i).some((nb) => region[nb] !== -1)) cands.push(i);
    if (!cands.length) break;
    const cell = cands[Math.floor(Math.random() * cands.length)];
    const an = neighbors(cell).filter((nb) => region[nb] !== -1);
    region[cell] = region[an[Math.floor(Math.random() * an.length)]];
    remaining--;
  }
  for (let i = 0; i < N * N; i++) if (region[i] === -1) { const nb = neighbors(i).find((x) => region[x] !== -1); region[i] = nb !== undefined ? region[nb] : 0; }
  return { N, region };
}
export function Queens({ cell = 44 }: { cell?: number }) {
  const [puz, setPuz] = useState(genQueens);
  const [queens, setQueens] = useState<Set<number>>(new Set());
  const { N, region } = puz;
  const toggle = (i: number) => setQueens((q) => { const n = new Set(q); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const arr = [...queens];
  const conflict = new Set<number>();
  const group: Record<string, number[]> = {};
  arr.forEach((i) => { const r = Math.floor(i / N), c = i % N; (group["r" + r] ||= []).push(i); (group["c" + c] ||= []).push(i); (group["g" + region[i]] ||= []).push(i); });
  Object.values(group).forEach((g) => { if (g.length > 1) g.forEach((x) => conflict.add(x)); });
  for (let a = 0; a < arr.length; a++) for (let b = a + 1; b < arr.length; b++) {
    const ra = Math.floor(arr[a] / N), ca = arr[a] % N, rb = Math.floor(arr[b] / N), cb = arr[b] % N;
    if (Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1) { conflict.add(arr[a]); conflict.add(arr[b]); }
  }
  const won = queens.size === N && conflict.size === 0;
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-slate-500 mb-3 text-center">One <b>crown</b> per row, column &amp; colour. No two crowns may touch — even diagonally.</p>
      <div className="grid rounded-xl overflow-hidden border-2 border-slate-300" style={{ gridTemplateColumns: `repeat(${N}, ${cell}px)` }}>
        {Array.from({ length: N * N }, (_, i) => {
          const has = queens.has(i); const bad = has && conflict.has(i);
          return (
            <button key={i} onClick={() => toggle(i)} className={`grid place-items-center border border-white/70 ${REGION_BG[region[i] % REGION_BG.length]}`} style={{ width: cell, height: cell }}>
              {has && <Crown className={`w-5 h-5 ${bad ? "text-rose-500" : "text-slate-800"}`} fill="currentColor" />}
            </button>
          );
        })}
      </div>
      {won ? <div className="mt-3 flex items-center gap-1.5 text-emerald-600 font-bold text-sm"><Trophy className="w-4 h-4" />Solved!</div> : <p className="mt-3 text-xs text-slate-400">{queens.size}/{N} crowns placed</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setQueens(new Set())} className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Clear</button>
        <button onClick={() => { setPuz(genQueens()); setQueens(new Set()); }} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />New</button>
      </div>
    </div>
  );
}

/* ============================ 2048 ============================ */
const TILE: Record<number, string> = {
  0: "bg-slate-100", 2: "bg-amber-50 text-slate-700", 4: "bg-amber-100 text-slate-700",
  8: "bg-orange-300 text-white", 16: "bg-orange-400 text-white", 32: "bg-orange-500 text-white",
  64: "bg-rose-400 text-white", 128: "bg-yellow-300 text-white", 256: "bg-yellow-400 text-white",
  512: "bg-yellow-500 text-white", 1024: "bg-indigo-400 text-white", 2048: "bg-indigo-600 text-white",
};
const slide2048 = (row: number[]) => { const a = row.filter((x) => x); for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; a.splice(i + 1, 1); } while (a.length < 4) a.push(0); return a; };
const spawn = (b: number[][]) => { const e: [number, number][] = []; b.forEach((row, r) => row.forEach((v, c) => { if (!v) e.push([r, c]); })); if (!e.length) return b; const [r, c] = e[Math.floor(Math.random() * e.length)]; const nb = b.map((x) => x.slice()); nb[r][c] = Math.random() < 0.9 ? 2 : 4; return nb; };
const init2048 = () => spawn(spawn(Array.from({ length: 4 }, () => [0, 0, 0, 0])));
const moveBoard = (board: number[][], dir: string) => {
  const b = board.map((r) => r.slice());
  if (dir === "left" || dir === "right") { for (let r = 0; r < 4; r++) { let line = b[r].slice(); if (dir === "right") line.reverse(); line = slide2048(line); if (dir === "right") line.reverse(); b[r] = line; } }
  else { for (let c = 0; c < 4; c++) { let line = [b[0][c], b[1][c], b[2][c], b[3][c]]; if (dir === "down") line.reverse(); line = slide2048(line); if (dir === "down") line.reverse(); for (let r = 0; r < 4; r++) b[r][c] = line[r]; } }
  return b;
};
export function G2048() {
  const [board, setBoard] = useState<number[][]>(init2048);
  const move = (dir: string) => setBoard((cur) => { const m = moveBoard(cur, dir); if (JSON.stringify(m) === JSON.stringify(cur)) return cur; return spawn(m); });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const map: Record<string, string> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }; if (map[e.key]) { e.preventDefault(); move(map[e.key]); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  const best = Math.max(...board.flat());
  const full = board.flat().every((v) => v) && !["left", "right", "up", "down"].some((d) => JSON.stringify(moveBoard(board, d)) !== JSON.stringify(board));
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[268px] mb-3"><p className="text-xs text-slate-500">Merge to <b>2048</b></p><span className="text-xs font-bold text-slate-700">Best: {best}</span></div>
      <div className="grid grid-cols-4 gap-2 p-2 bg-slate-200 rounded-xl">
        {board.flat().map((v, i) => <div key={i} className={`w-14 h-14 rounded-lg grid place-items-center font-bold ${TILE[v] || "bg-indigo-700 text-white"} ${v >= 1000 ? "text-sm" : "text-lg"}`}>{v || ""}</div>)}
      </div>
      {best >= 2048 && <div className="mt-3 flex items-center gap-1.5 text-emerald-600 font-bold text-sm"><Trophy className="w-4 h-4" />2048!</div>}
      {full && <div className="mt-3 text-sm font-bold text-rose-500">Game over</div>}
      <div className="mt-4 grid grid-cols-3 gap-1.5 w-[150px]">
        <span /><button onClick={() => move("up")} className="h-10 grid place-items-center rounded-lg bg-slate-100 hover:bg-slate-200"><ArrowUp className="w-4 h-4" /></button><span />
        <button onClick={() => move("left")} className="h-10 grid place-items-center rounded-lg bg-slate-100 hover:bg-slate-200"><ArrowLeft className="w-4 h-4" /></button>
        <button onClick={() => setBoard(init2048())} className="h-10 grid place-items-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"><RefreshCw className="w-4 h-4" /></button>
        <button onClick={() => move("right")} className="h-10 grid place-items-center rounded-lg bg-slate-100 hover:bg-slate-200"><ArrowRight className="w-4 h-4" /></button>
        <span /><button onClick={() => move("down")} className="h-10 grid place-items-center rounded-lg bg-slate-100 hover:bg-slate-200"><ArrowDown className="w-4 h-4" /></button><span />
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Arrow keys work too</p>
    </div>
  );
}

/* ============================ LIGHTS OUT ============================ */
const genLights = () => {
  const N = 5; let g = Array.from({ length: N }, () => Array(N).fill(false));
  const tog = (grid: boolean[][], r: number, c: number) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N) grid[nr][nc] = !grid[nr][nc]; });
  for (let k = 0; k < 6; k++) tog(g, Math.floor(Math.random() * N), Math.floor(Math.random() * N));
  return g;
};
export function Lights({ cell = 46 }: { cell?: number }) {
  const N = 5;
  const [grid, setGrid] = useState<boolean[][]>(genLights);
  const [moves, setMoves] = useState(0);
  const press = (r: number, c: number) => {
    setGrid((cur) => { const g = cur.map((row) => row.slice()); [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N) g[nr][nc] = !g[nr][nc]; }); return g; });
    setMoves((m) => m + 1);
  };
  const won = grid.flat().every((v) => !v);
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-slate-500 mb-3 text-center">Turn <b>all lights off</b>. A tap flips a tile and its neighbours.</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${N}, ${cell}px)` }}>
        {grid.map((row, r) => row.map((on, c) => <button key={`${r}-${c}`} onClick={() => press(r, c)} className={`rounded-lg transition ${on ? "bg-gradient-to-br from-amber-300 to-orange-400 shadow-inner" : "bg-slate-200 hover:bg-slate-300"}`} style={{ width: cell, height: cell }} />))}
      </div>
      {won ? <div className="mt-3 flex items-center gap-1.5 text-emerald-600 font-bold text-sm"><Trophy className="w-4 h-4" />Cleared in {moves}!</div> : <p className="mt-3 text-xs text-slate-400">{moves} moves</p>}
      <button onClick={() => { setGrid(genLights()); setMoves(0); }} className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />New</button>
    </div>
  );
}

/* ============================ RIDDLE ============================ */
export function Riddle() {
  const rand = (not?: number) => { let i = Math.floor(Math.random() * PUZZLES.length); while (i === not) i = Math.floor(Math.random() * PUZZLES.length); return i; };
  const [idx, setIdx] = useState(rand);
  const [reveal, setReveal] = useState(false);
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<null | "right" | "wrong">(null);
  const p = PUZZLES[idx];
  const next = () => { setIdx(rand(idx)); setReveal(false); setGuess(""); setVerdict(null); };
  const check = () => { const g = guess.trim().toLowerCase(); if (!g) return; const ans = p.a.toLowerCase(); const ok = ans.includes(g) || g.includes(ans.replace(/[^a-z0-9 ]/g, "").trim()); setVerdict(ok ? "right" : "wrong"); if (ok) setReveal(true); };
  return (
    <div className="w-full max-w-md mx-auto">
      <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-400">{p.cat} · #{p.id}</span>
      <p className="text-[15px] font-medium text-slate-800 leading-relaxed min-h-[4rem] mt-1">{p.q}</p>
      <div className="mt-3 flex gap-2">
        <input value={guess} onChange={(e) => { setGuess(e.target.value); setVerdict(null); }} onKeyDown={(e) => { if (e.key === "Enter") check(); }} placeholder="Your answer…" className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        <button onClick={check} className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" /></button>
      </div>
      {verdict === "right" && <p className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" />Correct!</p>}
      {verdict === "wrong" && <p className="mt-2 text-xs font-semibold text-amber-600 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" />Not quite.</p>}
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => setReveal((r) => !r)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{reveal ? "Hide" : "Reveal"}</button>
        <button onClick={next} className="text-xs font-semibold text-indigo-600 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Next</button>
      </div>
      {reveal && <div className="mt-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100"><p className="text-sm font-medium text-indigo-900">{p.a}</p></div>}
    </div>
  );
}

/* ============================ PATCH (shape fill) ============================ */
const PATCH_COLORS = ["#fca5a5", "#86efac", "#93c5fd", "#fcd34d", "#c4b5fd", "#fdba74", "#67e8f9"];
function genPatch() {
  const N = 5, k = 5;
  const region = new Array(N * N).fill(-1);
  const neighbors = (i: number) => { const r = Math.floor(i / N), c = i % N; const o: number[] = []; if (r > 0) o.push(i - N); if (r < N - 1) o.push(i + N); if (c > 0) o.push(i - 1); if (c < N - 1) o.push(i + 1); return o; };
  const seeds: number[] = [];
  while (seeds.length < k) { const i = Math.floor(Math.random() * N * N); if (!seeds.includes(i)) seeds.push(i); }
  seeds.forEach((s, id) => (region[s] = id));
  let remaining = N * N - k, guard = 0;
  while (remaining > 0 && guard++ < 100000) {
    const cands: number[] = [];
    for (let i = 0; i < N * N; i++) if (region[i] === -1 && neighbors(i).some((nb) => region[nb] !== -1)) cands.push(i);
    if (!cands.length) break;
    const cell = cands[Math.floor(Math.random() * cands.length)];
    const an = neighbors(cell).filter((nb) => region[nb] !== -1);
    region[cell] = region[an[Math.floor(Math.random() * an.length)]];
    remaining--;
  }
  for (let i = 0; i < N * N; i++) if (region[i] === -1) { const nb = neighbors(i).find((x) => region[x] !== -1); region[i] = nb !== undefined ? region[nb] : 0; }
  const pieces: { id: number; cells: { dr: number; dc: number }[]; w: number; h: number }[] = [];
  for (let id = 0; id < k; id++) {
    const cells: { r: number; c: number }[] = [];
    for (let i = 0; i < N * N; i++) if (region[i] === id) cells.push({ r: Math.floor(i / N), c: i % N });
    if (!cells.length) continue;
    const minR = Math.min(...cells.map((x) => x.r)), minC = Math.min(...cells.map((x) => x.c));
    const rel = cells.map((x) => ({ dr: x.r - minR, dc: x.c - minC }));
    pieces.push({ id, cells: rel, h: Math.max(...rel.map((x) => x.dr)) + 1, w: Math.max(...rel.map((x) => x.dc)) + 1 });
  }
  return { N, pieces };
}
export function Patch({ cell = 48 }: { cell?: number }) {
  const [puz, setPuz] = useState(genPatch);
  const { N, pieces } = puz;
  const [board, setBoard] = useState<(number | null)[]>(Array(N * N).fill(null));
  const [placed, setPlaced] = useState<Record<number, boolean>>({});
  const [sel, setSel] = useState<number | null>(null);
  const reset = () => { setBoard(Array(N * N).fill(null)); setPlaced({}); setSel(null); };
  const fresh = () => { setPuz(genPatch()); setBoard(Array(N * N).fill(null)); setPlaced({}); setSel(null); };
  const place = (cellIdx: number) => {
    if (board[cellIdx] !== null) { const id = board[cellIdx]; setBoard((b) => b.map((v) => (v === id ? null : v))); setPlaced((p) => ({ ...p, [id as number]: false })); return; }
    if (sel === null) return;
    const piece = pieces.find((p) => p.id === sel); if (!piece || placed[sel]) return;
    const r = Math.floor(cellIdx / N), c = cellIdx % N;
    const targets = piece.cells.map((d) => ({ r: r + d.dr, c: c + d.dc }));
    if (targets.some((t) => t.r < 0 || t.r >= N || t.c < 0 || t.c >= N)) return;
    const idxs = targets.map((t) => t.r * N + t.c);
    if (idxs.some((i) => board[i] !== null)) return;
    setBoard((b) => { const nb = b.slice(); idxs.forEach((i) => (nb[i] = sel)); return nb; });
    setPlaced((p) => ({ ...p, [sel]: true }));
    setSel(null);
  };
  const won = board.every((v) => v !== null);
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-slate-500 mb-3 text-center">Fit every <b>patch</b> into the board — no gaps, no overlaps. Pick a patch, tap a square to drop its top-left. Tap a placed patch to lift it.</p>
      <div className="grid rounded-xl overflow-hidden border-2 border-slate-300" style={{ gridTemplateColumns: `repeat(${N}, ${cell}px)` }}>
        {Array.from({ length: N * N }, (_, i) => {
          const id = board[i];
          return <button key={i} onClick={() => place(i)} className="border border-white/70" style={{ width: cell, height: cell, background: id === null ? "#f8fafc" : PATCH_COLORS[id % PATCH_COLORS.length] }} />;
        })}
      </div>
      {won ? <div className="mt-3 flex items-center gap-1.5 text-emerald-600 font-bold text-sm"><Trophy className="w-4 h-4" />Filled!</div> : <p className="mt-3 text-xs text-slate-400">{board.filter((v) => v !== null).length}/{N * N} filled</p>}
      {/* tray */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {pieces.filter((p) => !placed[p.id]).map((p) => (
          <button key={p.id} onClick={() => setSel(p.id)} className={`p-1.5 rounded-lg border-2 transition ${sel === p.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${p.w}, 14px)` }}>
              {Array.from({ length: p.w * p.h }, (_, gi) => {
                const dr = Math.floor(gi / p.w), dc = gi % p.w;
                const on = p.cells.some((cl) => cl.dr === dr && cl.dc === dc);
                return <div key={gi} className="rounded-sm" style={{ width: 14, height: 14, background: on ? PATCH_COLORS[p.id % PATCH_COLORS.length] : "transparent" }} />;
              })}
            </div>
          </button>
        ))}
        {pieces.every((p) => placed[p.id]) && !won && <span className="text-xs text-slate-400">All patches placed</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={reset} className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Reset</button>
        <button onClick={fresh} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />New</button>
      </div>
    </div>
  );
}

/* ============================ SHARED VIEW ============================ */
export function GameView({ game }: { game: Game }) {
  if (game === "zip") return <Zip />;
  if (game === "queens") return <Queens />;
  if (game === "patch") return <Patch />;
  if (game === "2048") return <G2048 />;
  if (game === "lights") return <Lights />;
  return <Riddle />;
}

/* ============================ PHONE PANEL (overview) ============================ */
export default function GamesPanel() {
  const [open, setOpen] = useState(true);
  const [game, setGame] = useState<Game>("zip");
  if (!open) {
    return (
      <div className="shrink-0 self-start sticky top-6">
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-2 px-2.5 py-4 rounded-2xl bg-gradient-to-b from-indigo-600 to-violet-600 text-white shadow-lg hover:shadow-xl transition">
          <Gamepad2 className="w-5 h-5" /><span className="text-xs font-bold tracking-wide" style={{ writingMode: "vertical-rl" }}>Puzzles</span>
        </button>
      </div>
    );
  }
  return (
    <div className="shrink-0 w-[360px] max-w-full self-start sticky top-6">
      <div className="relative rounded-[2.2rem] border-[7px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden" style={{ height: "min(78vh, 760px)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-b-2xl z-20" />
        <div className="h-full bg-slate-50 rounded-[1.6rem] flex flex-col overflow-hidden">
          <div className="px-4 pt-6 pb-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Gamepad2 className="w-5 h-5" /><span className="text-sm font-bold">Puzzles</span></div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 grid place-items-center rounded-lg bg-white/15 hover:bg-white/25"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-1">
              {GAMES.map((g) => <button key={g.key} onClick={() => setGame(g.key)} className={`flex-1 px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${game === g.key ? "bg-white text-indigo-700" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>{g.label}</button>)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4"><GameView game={game} /></div>
        </div>
      </div>
    </div>
  );
}
