'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter-tight',
});
const jetMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jet-mono',
});

type Cmd = { label: string; path: string; key: string; icon: string };

const COMMANDS: Cmd[] = [
  { label: 'Go to dashboard', path: '/dashboard', key: 'D', icon: 'M3 13h8V3H3zM13 21h8v-6h-8zM13 3v6h8V3zM3 21h8v-4H3z' },
  { label: 'My attendance', path: '/my-attendance', key: 'A', icon: 'M8 2v4M16 2v4M3 10h18M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M9 16l2 2 4-4' },
  { label: 'My profile', path: '/me', key: 'M', icon: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
  { label: 'My tasks', path: '/tasks', key: 'T', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { label: 'Run payroll', path: '/payroll', key: 'P', icon: 'M3 6h18v13H3zM3 11h18M7 15h4' },
  { label: 'View employees', path: '/employees', key: 'E', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: 'Contact support', path: '/support', key: 'S', icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z' },
];

const SUN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>';
const MOON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A1628" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z"/></svg>';

const CSS = `
.nwl404 { --blue:#1E5BFF; --blue2:#5B86FF; }
:root {
  --bg:#FAFBFD; --dots:rgba(10,22,40,0.05); --text:#0A1628;
  --muted:#5B6478; --muted2:#8893A8; --zero:#1E5BFF;
  --panel:#FFFFFF; --panel-border:#DAE0EE;
  --panel-shadow:0 40px 90px -30px rgba(10,22,40,0.28);
  --row-hover:#F3F6FD; --row-hover-border:rgba(30,91,255,0.28);
  --field-border:#DAE0EE; --kbd-bg:#F3F6FD; --kbd-border:#DAE0EE;
  --kbd-text:#5B6478; --icon-chip:#EEF2FF; --switch-track:#DAE0EE;
}
html.dark {
  --bg:#0A1628; --dots:rgba(180,200,255,0.10); --text:#F4F7FF;
  --muted:rgba(226,232,245,0.66); --muted2:rgba(226,232,245,0.45); --zero:#5B86FF;
  --panel:rgba(14,27,51,0.92); --panel-border:rgba(120,150,255,0.22);
  --panel-shadow:0 40px 90px -30px rgba(0,0,0,0.7);
  --row-hover:rgba(91,134,255,0.18); --row-hover-border:rgba(91,134,255,0.30);
  --field-border:rgba(255,255,255,0.10); --kbd-bg:rgba(255,255,255,0.08);
  --kbd-border:rgba(255,255,255,0.14); --kbd-text:rgba(255,255,255,0.7);
  --icon-chip:rgba(255,255,255,0.06); --switch-track:#1E5BFF;
}
.nwl404, .nwl404 * { box-sizing:border-box; }
.nwl404 {
  font-family:var(--font-inter-tight), system-ui, sans-serif; -webkit-font-smoothing:antialiased;
  background:var(--bg); color:var(--text);
  background-image:radial-gradient(circle at 1px 1px, var(--dots) 1px, transparent 0);
  background-size:30px 30px; transition:background-color .4s, color .4s;
  min-height:100vh; display:flex; flex-direction:column;
}
.nwl404 input { font-family:inherit; }
.nwl404 h1 { text-wrap:balance; }
.nwl404 .topbar { display:flex; align-items:center; justify-content:space-between; padding:26px 40px; }
.nwl404 .logo { display:inline-flex; align-items:center; gap:11px; }
.nwl404 .logo-name { font-weight:700; font-size:18px; letter-spacing:-0.02em; color:var(--text); }
.nwl404 .topbar-right { display:flex; align-items:center; gap:18px; }
.nwl404 .url { font-family:var(--font-jet-mono), monospace; font-size:12px; letter-spacing:0.06em; color:var(--muted2); }
.nwl404 .switch { width:60px; height:32px; border-radius:999px; cursor:pointer; position:relative;
  background:var(--switch-track); transition:background .3s; border:none; padding:0; flex:0 0 auto; }
.nwl404 .switch .knob { position:absolute; top:3px; left:3px; width:26px; height:26px; border-radius:50%; background:#fff;
  display:grid; place-items:center; transition:left .3s cubic-bezier(.16,.8,.24,1); box-shadow:0 2px 6px rgba(0,0,0,0.3); }
html.dark .nwl404 .switch .knob { left:31px; }
.nwl404 .main { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px 24px 80px; }
.nwl404 .code { font-size:clamp(90px,16vw,168px); font-weight:800; letter-spacing:-0.05em; line-height:1; color:var(--text); }
.nwl404 .code .z { color:var(--zero); }
.nwl404 h1.title { font-size:clamp(24px,3.4vw,32px); font-weight:700; letter-spacing:-0.03em; margin:14px 0 0; }
.nwl404 .sub { font-size:16.5px; color:var(--muted); margin-top:12px; max-width:440px; line-height:1.5; }
.nwl404 .hint { font-family:var(--font-jet-mono), monospace; font-size:12.5px; color:var(--muted2); margin-top:8px; display:inline-flex; align-items:center; gap:7px; }
.nwl404 .palette { width:540px; max-width:100%; margin-top:30px; border-radius:16px; overflow:hidden; text-align:left;
  background:var(--panel); border:1px solid var(--panel-border); box-shadow:var(--panel-shadow); transition:background-color .4s, border-color .4s; }
.nwl404 .palette-search { display:flex; align-items:center; gap:12px; padding:14px 18px; border-bottom:1px solid var(--field-border); }
.nwl404 .palette-search input { flex:1; border:none; outline:none; background:transparent; font-size:15.5px; color:var(--text); }
.nwl404 .palette-search input::placeholder { color:var(--muted2); }
.nwl404 .palette-list { padding:8px; max-height:280px; overflow-y:auto; }
.nwl404 .cmd { display:flex; align-items:center; gap:12px; padding:11px 12px; border-radius:10px; cursor:pointer; border:1px solid transparent; }
.nwl404 .cmd.sel { background:var(--row-hover); border-color:var(--row-hover-border); }
.nwl404 .cmd-icon { width:30px; height:30px; border-radius:8px; background:var(--icon-chip); color:var(--blue); display:grid; place-items:center; flex:0 0 auto; }
html.dark .nwl404 .cmd-icon { color:var(--blue2); }
.nwl404 .cmd-label { flex:1; font-size:14.5px; font-weight:500; color:var(--text); }
.nwl404 .cmd-path { font-family:var(--font-jet-mono), monospace; font-size:12px; color:var(--muted2); }
.nwl404 .empty { padding:26px; text-align:center; color:var(--muted); font-size:14px; }
.nwl404 kbd { font-family:var(--font-jet-mono), monospace; font-size:11px; color:var(--kbd-text);
  background:var(--kbd-bg); border:1px solid var(--kbd-border); border-radius:5px; padding:2px 6px; margin:0 1px; }
.nwl404 .footer-hint { margin-top:22px; display:flex; align-items:center; gap:16px; font-family:var(--font-jet-mono), monospace; font-size:12px; color:var(--muted2); }
.nwl404 .footer-hint .sep { opacity:0.5; }
`;

export default function NotFound() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(t) || c.path.includes(t));
  }, [q]);

  useEffect(() => {
    let isDark = false;
    try {
      isDark = localStorage.getItem('nwl404-theme') === 'dark';
    } catch {}
    setDark(isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('nwl404-theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);

  useEffect(() => {
    if (sel > filtered.length - 1) setSel(0);
  }, [filtered.length, sel]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scrollSel = (i: number) => {
    const el = listRef.current?.querySelectorAll<HTMLElement>('.cmd')[i];
    el?.scrollIntoView({ block: 'nearest' });
  };

  const go = (cmd?: Cmd) => {
    if (!cmd) return;
    router.push(cmd.path);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const n = Math.min(sel + 1, filtered.length - 1);
      setSel(n);
      scrollSel(n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.max(sel - 1, 0);
      setSel(n);
      scrollSel(n);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(filtered[sel]);
    }
  };

  return (
    <div className={`nwl404 ${interTight.variable} ${jetMono.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="topbar">
        <span className="logo">
          <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
            <rect x="14" y="12" width="9" height="40" fill="currentColor" style={{ color: 'var(--text)' }} />
            <rect x="41" y="12" width="9" height="40" fill="currentColor" style={{ color: 'var(--text)' }} />
            <path d="M14 12 L23 12 L50 52 L41 52 Z" fill="#1E5BFF" />
          </svg>
          <span className="logo-name">NorthWeb Labs</span>
        </span>
        <div className="topbar-right">
          <span className="url">northweblabs.com</span>
          <button
            className="switch"
            aria-label="Toggle theme"
            onClick={() => setDark((d) => !d)}
          >
            <span className="knob" dangerouslySetInnerHTML={{ __html: dark ? SUN : MOON }} />
          </button>
        </div>
      </div>

      <div className="main">
        <div className="code">
          4<span className="z">0</span>4
        </div>
        <h1 className="title">That page is gone. Where to?</h1>
        <p className="sub">
          We couldn&apos;t find what you were looking for — but you can jump anywhere from here.
        </p>
        <div className="hint">
          use <kbd>↑</kbd>
          <kbd>↓</kbd> to navigate · <kbd>↵</kbd> to go · this palette actually works
        </div>

        <div className="palette">
          <div className="palette-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="6" />
              <path d="M16 16l4 4" />
            </svg>
            <input
              ref={inputRef}
              autoFocus
              placeholder="Type a command or page…"
              autoComplete="off"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={onKeyDown}
            />
            <kbd>⌘K</kbd>
          </div>
          <div className="palette-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="empty">No commands match &quot;{q}&quot;. Try “payroll” or “tasks”.</div>
            ) : (
              filtered.map((c, i) => (
                <div
                  key={c.path}
                  className={`cmd ${i === sel ? 'sel' : ''}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(c)}
                >
                  <span className="cmd-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={c.icon} />
                    </svg>
                  </span>
                  <span className="cmd-label">{c.label}</span>
                  <span className="cmd-path">{c.path}</span>
                  <kbd>{c.key}</kbd>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="footer-hint">
          <span>ERROR 404</span>
          <span className="sep">·</span>
          <span>PAGE NOT FOUND</span>
          <span className="sep">·</span>
          <span>{dark ? 'DARK MODE' : 'LIGHT MODE'}</span>
        </div>
      </div>
    </div>
  );
}