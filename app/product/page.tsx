import Footer from '@/components/Footer';
import Link from 'next/link';
import React from 'react';

/* ============================================================
   NorthWeb Labs — Product Page
   Single-file Next.js App Router page (app/product/page.tsx)
   Same design system as the landing page. Plain global <style>
   tag — no styled-jsx registry needed.
   ============================================================ */

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const CheckIcon = ({ color = '#fff' }: { color?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Logo = ({ light = false }: { light?: boolean }) => (
  <Link href="/" className="logo" aria-label="NorthWeb Labs home">
    <span className="logo-mark" aria-hidden="true">N</span>
    <span className={`logo-text ${light ? 'light' : ''}`}>
      NorthWeb <span className="logo-accent">Labs</span>
    </span>
  </Link>
);

const NAV = [
  { label: 'Product', href: '/product' },
  { label: 'Solutions', href: '/solutions' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Customers', href: '/customers' },
];

const Header = () => (
  <header className="site-header">
    <div className="container header-inner">
      <Logo />
      <nav className="main-nav" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`nav-link ${n.href === '/product' ? 'active' : ''}`}>{n.label}</Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link href="/login" className="nav-link signin">Sign in</Link>
        <Link href="/signup" className="btn btn-dark">Get started <ArrowRight size={15} /></Link>
      </div>
    </div>
  </header>
);

/* ---------- Module data ---------- */
type Module = {
  id: string;
  href: string;
  kicker: string;
  title: string;
  desc: string;
  points: string[];
  tile: 'blue' | 'green' | 'amber' | 'indigo' | 'slate';
  icon: React.ReactNode;
  visual: React.ReactNode;
};

const iconStroke = {
  blue: '#2563eb',
  green: '#16a34a',
  amber: '#d97706',
  indigo: '#4f46e5',
  slate: '#334155',
} as const;

/* ---- Small visual mocks per module ---- */
const PeopleVisual = () => (
  <div className="mock">
    <div className="mock-title">People directory</div>
    {[
      { in: 'AK', name: 'Arjun Kapoor', role: 'Engineering · Bengaluru' },
      { in: 'PS', name: 'Priya Sharma', role: 'Design · Pune' },
      { in: 'RV', name: 'Rahul Verma', role: 'Finance · Mumbai' },
    ].map((p) => (
      <div className="person-row" key={p.in}>
        <span className="person-avatar">{p.in}</span>
        <span>
          <strong>{p.name}</strong>
          <em>{p.role}</em>
        </span>
        <span className="person-pill">Active</span>
      </div>
    ))}
  </div>
);

const AttendanceVisual = () => (
  <div className="mock">
    <div className="mock-title">Today · 06 Jun</div>
    <div className="att-card">
      <div className="att-status"><i className="status-dot" /> Checked in</div>
      <div className="att-time">09:02 → 18:30</div>
    </div>
    <div className="att-week">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <span key={i} className={`day ${i < 5 ? 'on' : ''}`}>{d}</span>
      ))}
    </div>
    <div className="mock-foot">Shift 09:00–18:00 · Geo verified</div>
  </div>
);

const LeaveVisual = () => (
  <div className="mock">
    <div className="mock-title">Leave balances</div>
    {[
      { label: 'Earned', used: 6, total: 18 },
      { label: 'Casual', used: 3, total: 12 },
      { label: 'Sick', used: 1, total: 10 },
    ].map((l) => (
      <div className="bal-row" key={l.label}>
        <span className="bal-label">{l.label}</span>
        <span className="bal-bar"><i style={{ width: `${(l.used / l.total) * 100}%` }} /></span>
        <span className="bal-num">{l.total - l.used} left</span>
      </div>
    ))}
    <div className="leave-chip"><span className="chip-check"><CheckIcon /></span> Leave approved · 2 days</div>
  </div>
);

const PayrollVisual = () => (
  <div className="mock">
    <div className="mock-title">Payroll · June</div>
    <div className="pay-amount">₹1,84,200</div>
    <div className="pay-lines">
      <div><span>Earnings</span><span>₹2,10,000</span></div>
      <div><span>PF + ESI</span><span>− ₹14,300</span></div>
      <div><span>TDS</span><span>− ₹11,500</span></div>
    </div>
    <div className="pay-done"><i className="chip-dot" /> Payroll run · done</div>
  </div>
);

const PerformanceVisual = () => (
  <div className="mock">
    <div className="mock-title">Q2 goals</div>
    {[
      { g: 'Ship HRMS v2 mobile app', p: 80 },
      { g: 'Reduce ticket SLA to 4h', p: 55 },
      { g: 'Hire 6 engineers', p: 35 },
    ].map((g) => (
      <div className="goal-row" key={g.g}>
        <div className="goal-head"><span>{g.g}</span><strong>{g.p}%</strong></div>
        <span className="goal-bar"><i style={{ width: `${g.p}%` }} /></span>
      </div>
    ))}
  </div>
);

const MODULES: Module[] = [
  {
    id: 'people',
    href: '/product/people',
    kicker: 'People',
    title: 'A directory your whole company loves',
    desc: 'One source of truth for every employee — profiles, documents, org chart and onboarding journeys, searchable in seconds.',
    points: ['Org chart that builds itself', 'Document vault with expiry alerts', 'Onboarding & exit checklists'],
    tile: 'slate',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke.slate} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    visual: <PeopleVisual />,
  },
  {
    id: 'attendance',
    href: '/product/attendance',
    kicker: 'Attendance & time',
    title: 'Clock-in that just works, anywhere',
    desc: 'Geo-aware check-in from web or mobile, automatic shifts and overtime, and regularisation requests that resolve themselves.',
    points: ['Geo-fenced & selfie check-in', 'Shift planning and rosters', 'Overtime & regularisation, automatic'],
    tile: 'blue',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    visual: <AttendanceVisual />,
  },
  {
    id: 'leave',
    href: '/product/leave',
    kicker: 'Leave management',
    title: 'Policies your team can self-serve',
    desc: 'Configure any leave policy once — accruals, carry-forward, encashment — and let balances and approvals run on autopilot.',
    points: ['Any policy: earned, casual, sick, comp-off', 'One-tap approvals with smart routing', 'Calendar sync & team availability view'],
    tile: 'green',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
    visual: <LeaveVisual />,
  },
  {
    id: 'payroll',
    href: '/product/payroll',
    kicker: 'Payroll & compliance',
    title: 'Accurate payroll, compliance handled',
    desc: 'Salaries, taxes and payslips auto-calculated from attendance and leave. PF, ESI, PT and TDS filings ready when you are.',
    points: ['One-click payroll runs', 'PF, ESI, PT & TDS built in', 'Payslips & Form 16, self-serve'],
    tile: 'amber',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
    visual: <PayrollVisual />,
  },
  {
    id: 'performance',
    href: '/product/performance',
    kicker: 'Performance',
    title: 'Reviews that fit how people work',
    desc: 'Lightweight goals, regular check-ins and fair review cycles — without the spreadsheet circus every quarter.',
    points: ['OKRs and simple goals', '1:1 check-ins with shared notes', '360° reviews & calibration'],
    tile: 'indigo',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="5" width="3" height="13" /></svg>,
    visual: <PerformanceVisual />,
  },
];

export default function ProductPage() {
  return (
    <div className="page">
      <Header />

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="kicker">Product</div>
          <h1>
            Every tool your people team needs.<br />
            <span className="accent">None of the clutter.</span>
          </h1>
          <p className="hero-sub">
            Five modules, one workspace, zero stitching. Each one is great on its own —
            together they run your entire employee lifecycle.
          </p>
          <div className="hero-ctas">
            <Link href="/signup" className="btn btn-primary">Start free <ArrowRight /></Link>
            <Link href="/demo" className="btn btn-outline">Book a demo</Link>
          </div>

          {/* Module quick-nav */}
          <div className="module-nav">
            {MODULES.map((m) => (
              <a key={m.id} href={`#${m.id}`} className="module-nav-item">
                <span className={`icon-tile sm ${m.tile}-tile`}>{m.icon}</span>
                {m.kicker}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MODULES ============ */}
      {MODULES.map((m, i) => (
        <section key={m.id} id={m.id} className={`module ${i % 2 === 1 ? 'alt' : ''}`}>
          <div className={`container module-grid ${i % 2 === 1 ? 'flip' : ''}`}>
            <div className="module-copy">
              <span className={`icon-tile ${m.tile}-tile`}>{m.icon}</span>
              <div className="kicker" style={{ marginTop: 22 }}>{m.kicker}</div>
              <h2>{m.title}</h2>
              <p className="module-desc">{m.desc}</p>
              <ul className="point-list">
                {m.points.map((p) => (
                  <li key={p}>
                    <span className="check-badge"><CheckIcon /></span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link href={m.href} className="text-link">Explore {m.kicker} <ArrowRight size={15} /></Link>
            </div>
            <div className="module-visual">
              <div className="visual-frame">{m.visual}</div>
            </div>
          </div>
        </section>
      ))}

      {/* ============ AI ASSISTANT BAND ============ */}
      <section className="ai-band">
        <div className="container ai-inner">
          <span className="pill light"><i className="pill-dot" /> New</span>
          <h2>Meet your AI leave &amp; payroll assistant.</h2>
          <p>
            &ldquo;How many casual leaves do I have left?&rdquo; &ldquo;Why is my net pay different this month?&rdquo;
            Your team asks in plain language — the assistant answers from your real policies and payroll data.
          </p>
          <div className="ai-chat">
            <div className="ai-msg user">How many earned leaves can I carry forward this year?</div>
            <div className="ai-msg bot">You can carry forward up to <strong>15 earned leaves</strong>. You currently have 12 — all of them will carry over on 1 Jan.</div>
          </div>
          <Link href="/signup" className="btn btn-white">Try it free <ArrowRight /></Link>
        </div>
      </section>

      {/* ============ PLATFORM EXTRAS ============ */}
      <section className="extras">
        <div className="container">
          <div className="kicker">Under the hood</div>
          <h2>Built like a platform, not a patchwork.</h2>
          <div className="extras-grid">
            {[
              { t: 'Role-based access', d: 'Granular permissions for HR, managers and employees — everyone sees exactly what they should.' },
              { t: 'Audit trail', d: 'Every change to pay, leave or profile data is logged and reviewable.' },
              { t: 'Mobile apps', d: 'Full-featured iOS and Android apps for check-in, leave and payslips on the go.' },
              { t: 'Integrations & API', d: 'Slack, Google Workspace, Tally and a clean REST API for everything else.' },
              { t: 'Bank-grade security', d: 'Encryption at rest and in transit, SSO/SAML, and India data residency.' },
              { t: 'Fast onboarding', d: 'We migrate your data from spreadsheets or your old HRMS — usually in a day.' },
            ].map((x) => (
              <div key={x.t} className="extra-card">
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="cta-banner-wrap">
        <div className="container">
          <div className="cta-banner">
            <span className="banner-n n1" aria-hidden="true">N</span>
            <span className="banner-n n2" aria-hidden="true">N</span>
            <h2>See the whole platform in 20 minutes.</h2>
            <p>Start free in minutes, or let us walk you through it — your call.</p>
            <div className="cta-banner-actions">
              <Link href="/signup" className="btn btn-white">Start free <ArrowRight /></Link>
              <Link href="/demo" className="btn btn-ghost">Book a demo</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ============ STYLES (plain global CSS) ============ */}
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #0b1220; background: #fff; -webkit-font-smoothing: antialiased;
        }
        a { text-decoration: none; color: inherit; }
        ul { list-style: none; }

        .page { overflow-x: hidden; }
        .container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        .kicker {
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 12px; font-weight: 700; letter-spacing: 0.22em;
          text-transform: uppercase; color: #2563eb; margin-bottom: 16px;
        }
        .accent { color: #2563eb; }

        /* Buttons */
        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600; border-radius: 12px;
          padding: 13px 24px; cursor: pointer; border: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          white-space: nowrap;
        }
        .btn:hover { transform: translateY(-1px); }
        .btn-primary { background: #2563eb; color: #fff; box-shadow: 0 8px 20px rgba(37,99,235,0.28); }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-dark { background: #0b1220; color: #fff; }
        .btn-dark:hover { background: #1a2436; }
        .btn-outline { background: #fff; color: #0b1220; border: 1px solid #dbe1ea; }
        .btn-outline:hover { border-color: #b9c3d4; }
        .btn-white { background: #fff; color: #0b1220; }
        .btn-ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.45); }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }

        /* Header */
        .site-header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);
          border-bottom: 1px solid #eef1f6;
        }
        .header-inner { display: flex; align-items: center; gap: 36px; height: 76px; }
        .logo { display: inline-flex; align-items: center; gap: 10px; }
        .logo-mark {
          width: 36px; height: 36px; border-radius: 10px; background: #0b1220;
          color: #fff; display: inline-flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 19px;
        }
        .logo-text { font-weight: 800; font-size: 18px; color: #0b1220; }
        .logo-text.light { color: #fff; }
        .logo-accent { color: #2563eb; }
        .main-nav { display: flex; gap: 28px; }
        .nav-link { font-size: 15px; font-weight: 500; color: #3b4456; transition: color 0.15s; }
        .nav-link:hover { color: #0b1220; }
        .nav-link.active { color: #2563eb; font-weight: 700; }
        .header-actions { margin-left: auto; display: flex; align-items: center; gap: 20px; }
        .signin { font-weight: 600; color: #0b1220; }

        /* Hero */
        .hero {
          background: linear-gradient(180deg, #fff 0%, #f4f7fb 100%);
          padding: 92px 0 72px; text-align: center;
        }
        .hero-inner { max-width: 880px; }
        .hero h1 {
          font-size: clamp(38px, 5vw, 60px); line-height: 1.08;
          letter-spacing: -0.03em; font-weight: 800;
        }
        .hero-sub {
          margin: 24px auto 0; font-size: 18px; line-height: 1.65;
          color: #4a5468; max-width: 580px;
        }
        .hero-ctas { display: flex; justify-content: center; gap: 14px; margin-top: 34px; }
        .pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: #e3ecfd; color: #1d4ed8; border-radius: 999px;
          font-size: 13.5px; font-weight: 600; padding: 8px 16px; margin-bottom: 24px;
        }
        .pill.light { background: rgba(255,255,255,0.15); color: #fff; }
        .pill-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

        .module-nav {
          margin-top: 56px; display: flex; flex-wrap: wrap;
          justify-content: center; gap: 12px;
        }
        .module-nav-item {
          display: inline-flex; align-items: center; gap: 10px;
          background: #fff; border: 1px solid #e7ecf3; border-radius: 999px;
          padding: 9px 18px 9px 9px; font-size: 14.5px; font-weight: 600;
          box-shadow: 0 4px 12px rgba(15,30,60,0.05);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .module-nav-item:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,30,60,0.1); }

        /* Icon tiles */
        .icon-tile {
          width: 52px; height: 52px; border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .icon-tile.sm { width: 34px; height: 34px; border-radius: 10px; }
        .icon-tile.sm svg { width: 16px; height: 16px; }
        .blue-tile { background: #e3ecfd; }
        .green-tile { background: #dcf5e6; }
        .amber-tile { background: #fdeed3; }
        .indigo-tile { background: #e4e4fb; }
        .slate-tile { background: #e8edf5; }

        /* Modules */
        .module { padding: 100px 0; }
        .module.alt { background: #f4f7fb; }
        .module-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 72px; align-items: center;
        }
        .module-grid.flip .module-copy { order: 2; }
        .module-grid.flip .module-visual { order: 1; }
        .module h2 {
          font-size: clamp(30px, 3.4vw, 40px); font-weight: 800;
          letter-spacing: -0.025em; line-height: 1.15;
        }
        .module-desc { margin-top: 16px; font-size: 17px; line-height: 1.65; color: #4a5468; }
        .point-list { margin: 28px 0 30px; display: flex; flex-direction: column; gap: 14px; }
        .point-list li { display: flex; align-items: center; gap: 12px; font-size: 15.5px; font-weight: 600; }
        .check-badge {
          width: 26px; height: 26px; border-radius: 8px; background: #22c55e;
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .text-link {
          display: inline-flex; align-items: center; gap: 7px;
          color: #2563eb; font-weight: 700; font-size: 15.5px;
        }
        .text-link:hover { color: #1d4ed8; }

        .visual-frame {
          background: linear-gradient(135deg, #dde7fb 0%, #eef2fc 60%, #f6f8fe 100%);
          border-radius: 24px; padding: 36px;
        }
        .module.alt .visual-frame { background: linear-gradient(135deg, #fff 0%, #eef2fc 100%); border: 1px solid #e7ecf3; }

        /* Mock cards */
        .mock {
          background: #fff; border: 1px solid #e7ecf3; border-radius: 16px;
          padding: 20px 22px; box-shadow: 0 20px 48px rgba(15,30,60,0.12);
          font-size: 14px;
        }
        .mock-title { font-size: 13px; font-weight: 700; color: #67718a; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px; }
        .mock-foot { margin-top: 14px; font-size: 12.5px; color: #67718a; }

        .person-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid #f1f4f9; }
        .person-row:first-of-type { border-top: none; }
        .person-avatar {
          width: 38px; height: 38px; border-radius: 50%; background: #2563eb; color: #fff;
          font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .person-row strong { display: block; font-size: 14.5px; }
        .person-row em { display: block; font-style: normal; font-size: 12.5px; color: #67718a; }
        .person-pill {
          margin-left: auto; font-size: 12px; font-weight: 700; color: #16a34a;
          background: #dcf5e6; border-radius: 999px; padding: 4px 10px;
        }

        .att-card { border: 1px solid #e7ecf3; border-radius: 12px; padding: 14px 16px; }
        .att-status { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
        .att-time { font-family: ui-monospace, 'SF Mono', Menlo, monospace; color: #67718a; font-size: 13px; margin-top: 6px; }
        .att-week { display: flex; gap: 8px; margin-top: 14px; }
        .day {
          width: 34px; height: 34px; border-radius: 9px; background: #eef1f6; color: #8a93a6;
          font-size: 12.5px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;
        }
        .day.on { background: #2563eb; color: #fff; }

        .bal-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
        .bal-label { width: 60px; font-weight: 600; font-size: 14px; }
        .bal-bar { flex: 1; height: 8px; border-radius: 4px; background: #e8edf5; overflow: hidden; }
        .bal-bar i { display: block; height: 100%; background: #2563eb; border-radius: 4px; }
        .bal-num { width: 56px; text-align: right; font-size: 12.5px; color: #67718a; }
        .leave-chip {
          margin-top: 14px; display: inline-flex; align-items: center; gap: 10px;
          background: #f3faf6; border: 1px solid #d2efdd; border-radius: 12px;
          padding: 9px 14px 9px 9px; font-weight: 700; font-size: 13.5px;
        }
        .chip-check {
          width: 28px; height: 28px; border-radius: 8px; background: #22c55e;
          display: inline-flex; align-items: center; justify-content: center;
        }

        .pay-amount { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 30px; font-weight: 700; }
        .pay-lines { margin-top: 14px; border-top: 1px solid #f1f4f9; }
        .pay-lines div { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f1f4f9; color: #4a5468; font-size: 14px; }
        .pay-lines span:last-child { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
        .pay-done {
          margin-top: 14px; display: inline-flex; align-items: center; gap: 8px;
          font-weight: 700; font-size: 13.5px; background: #eef3fe; border-radius: 999px; padding: 8px 14px;
        }
        .chip-dot { width: 9px; height: 9px; border-radius: 50%; background: #2563eb; }

        .goal-row { padding: 9px 0; }
        .goal-head { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; margin-bottom: 7px; }
        .goal-head strong { font-family: ui-monospace, 'SF Mono', Menlo, monospace; color: #2563eb; }
        .goal-bar { display: block; height: 8px; border-radius: 4px; background: #e8edf5; overflow: hidden; }
        .goal-bar i { display: block; height: 100%; background: #4f46e5; border-radius: 4px; }

        /* AI band */
        .ai-band {
          background: radial-gradient(120% 140% at 80% 0%, #1a2c52 0%, #0b1220 60%);
          padding: 110px 0; text-align: center;
        }
        .ai-inner { max-width: 760px; }
        .ai-band h2 { color: #fff; font-size: clamp(30px, 3.6vw, 42px); font-weight: 800; letter-spacing: -0.02em; }
        .ai-band > .container > p, .ai-inner > p {
          color: #b9c3d8; font-size: 17px; line-height: 1.7; margin: 18px auto 36px; max-width: 620px;
        }
        .ai-chat { max-width: 560px; margin: 0 auto 36px; display: flex; flex-direction: column; gap: 12px; }
        .ai-msg {
          border-radius: 16px; padding: 14px 18px; font-size: 15px; line-height: 1.55; text-align: left;
        }
        .ai-msg.user { background: #2563eb; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; max-width: 82%; }
        .ai-msg.bot { background: rgba(255,255,255,0.08); color: #dde4f0; border: 1px solid rgba(255,255,255,0.12); align-self: flex-start; border-bottom-left-radius: 4px; max-width: 88%; }
        .ai-msg.bot strong { color: #fff; }

        /* Extras */
        .extras { padding: 110px 0; }
        .extras h2 { font-size: clamp(30px, 3.6vw, 42px); font-weight: 800; letter-spacing: -0.025em; }
        .extras-grid {
          margin-top: 48px; display: grid;
          grid-template-columns: repeat(3, 1fr); gap: 22px;
        }
        .extra-card {
          background: #fff; border: 1px solid #e7ecf3; border-radius: 18px; padding: 28px;
          box-shadow: 0 4px 14px rgba(15,30,60,0.04);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .extra-card:hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(15,30,60,0.1); }
        .extra-card h3 { font-size: 17.5px; font-weight: 800; margin-bottom: 9px; }
        .extra-card p { font-size: 14.5px; line-height: 1.6; color: #4a5468; }

        /* CTA banner */
        .cta-banner-wrap { padding: 0 0 110px; background: #fff; }
        .cta-banner {
          position: relative; overflow: hidden; text-align: center;
          background: linear-gradient(120deg, #2057e0 0%, #3b6ef5 60%, #5b85f7 100%);
          border-radius: 28px; padding: 86px 32px;
          box-shadow: 0 28px 60px rgba(37,99,235,0.35);
        }
        .banner-n {
          position: absolute; font-weight: 900; color: rgba(255,255,255,0.12);
          line-height: 0.8; pointer-events: none; user-select: none;
        }
        .n1 { font-size: 320px; top: -60px; left: -30px; }
        .n2 { font-size: 260px; bottom: -80px; right: -20px; }
        .cta-banner h2 { color: #fff; font-size: clamp(30px, 4vw, 44px); font-weight: 800; letter-spacing: -0.02em; position: relative; }
        .cta-banner p { color: rgba(255,255,255,0.88); font-size: 17.5px; margin: 16px auto 36px; max-width: 520px; position: relative; }
        .cta-banner-actions { display: flex; justify-content: center; gap: 14px; position: relative; }

        /* Footer */
        .footer { background: #0b1220; color: #aab3c5; padding: 78px 0 36px; }
        .footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 40px; }
        .footer-brand p { margin-top: 20px; font-size: 15px; line-height: 1.7; }
        .footer-col { display: flex; flex-direction: column; gap: 13px; }
        .footer-col h5 { color: #fff; font-size: 14.5px; font-weight: 700; margin-bottom: 6px; }
        .footer-col a { font-size: 14.5px; color: #aab3c5; transition: color 0.15s; }
        .footer-col a:hover { color: #fff; }
        .footer-bottom {
          margin-top: 64px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
        }
        .footer-copy { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #7e8aa0; }
        .footer-legal { display: flex; gap: 24px; }
        .footer-legal a { font-size: 13.5px; color: #aab3c5; }
        .footer-legal a:hover { color: #fff; }

        /* Responsive */
        @media (max-width: 980px) {
          .module-grid, .module-grid.flip { grid-template-columns: 1fr; gap: 40px; }
          .module-grid.flip .module-copy { order: 1; }
          .module-grid.flip .module-visual { order: 2; }
          .extras-grid { grid-template-columns: 1fr 1fr; }
          .footer-grid { grid-template-columns: 1fr 1fr; }
          .main-nav { display: none; }
        }
        @media (max-width: 560px) {
          .hero { padding-top: 56px; }
          .hero-ctas, .cta-banner-actions { flex-direction: column; align-items: stretch; }
          .extras-grid { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: 1fr; }
          .visual-frame { padding: 20px; }
          .signin { display: none; }
          .module { padding: 70px 0; }
        }
      ` }} />
    </div>
  );
}