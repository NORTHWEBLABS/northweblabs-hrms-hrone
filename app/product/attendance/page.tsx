import Link from 'next/link';
import React from 'react';
import Footer from '@/components/Footer';

/* ============================================================
   NorthWeb Labs — Attendance & Time product page
   File: app/product/attendance/page.tsx
   Marketing page for the Attendance module. Links into the
   interactive preview at /product/attendance/preview.
   Plain global <style> tag — no styled-jsx registry needed.
   ============================================================ */

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Logo = () => (
  <Link href="/" className="logo" aria-label="NorthWeb Labs home">
    <span className="logo-mark" aria-hidden="true">N</span>
    <span className="logo-text">NorthWeb <span className="logo-accent">Labs</span></span>
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

const FEATURES = [
  {
    t: 'Geo-aware check-in',
    d: 'Web and mobile clock-in with geo-fencing and optional selfie verification — no biometric hardware needed.',
  },
  {
    t: 'WhatsApp attendance',
    d: "Staff send 'IN' on WhatsApp and it lands on your dashboard instantly — geo-tagged and time-stamped.",
  },
  {
    t: 'Shifts & rosters',
    d: 'Plan weekly rosters, rotate shifts, and handle night shifts with automatic day-boundary logic.',
  },
  {
    t: 'Overtime, automatic',
    d: 'Overtime computed from shift rules and approved in one tap — flows straight into payroll.',
  },
  {
    t: 'Regularisation requests',
    d: 'Missed a punch? Employees raise a request, managers approve, the record fixes itself.',
  },
  {
    t: 'Reports & exports',
    d: 'Monthly registers, muster rolls, late-comer reports — exportable to Excel in a click.',
  },
];

export default function AttendanceProductPage() {
  return (
    <div className="page">
      <Header />

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="pill"><i className="pill-dot" /> Attendance &amp; time</span>
            <h1>
              Clock-in that just works.<br />
              <span className="accent">Anywhere your team is.</span>
            </h1>
            <p className="hero-sub">
              Geo-aware check-in from web, mobile or WhatsApp. Shifts, overtime
              and regularisation handled automatically — and every minute flows
              straight into payroll.
            </p>
            <div className="hero-ctas">
              <Link href="/product/attendance/preview" className="btn btn-primary">Try the live preview <ArrowRight /></Link>
              <Link href="/signup" className="btn btn-outline">Start free</Link>
            </div>
            <div className="hero-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              Real product, sample data — no signup needed
            </div>
          </div>

          {/* Mini attendance mock */}
          <div className="hero-visual">
            <div className="mock">
              <div className="mock-title">Today · Attendance</div>
              <div className="att-card">
                <div className="att-status"><i className="status-dot" /> Checked in</div>
                <div className="att-time">09:02 → 18:30</div>
              </div>
              <div className="att-rows">
                {[
                  { in: 'AI', name: 'Ananya Iyer', t: '09:02', wa: false },
                  { in: 'AK', name: 'Arjun Kapoor', t: '09:14', wa: true },
                  { in: 'PS', name: 'Priya Sharma', t: '09:26', wa: true },
                ].map((p) => (
                  <div className="att-row" key={p.in}>
                    <span className="att-avatar">{p.in}</span>
                    <span className="att-name">{p.name}</span>
                    {p.wa && <span className="wa-tag">WA</span>}
                    <span className="att-in">In: {p.t}</span>
                  </div>
                ))}
              </div>
              <div className="chip chip-leave">
                <span className="chip-check"><CheckIcon /></span>
                <span>
                  <strong>Regularised</strong>
                  <em>Missed punch · fixed</em>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="features">
        <div className="container">
          <div className="kicker">Everything in the box</div>
          <h2>Attendance without the chasing.</h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.t} className="feature-card">
                <span className="check-badge"><CheckIcon /></span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHATSAPP BAND ============ */}
      <section className="wa-band">
        <div className="container wa-inner">
          <div className="kicker light">No app to install</div>
          <h2>Your staff check in on WhatsApp.</h2>
          <p>
            Employees send &lsquo;IN&rsquo; when they reach work and &lsquo;OUT&rsquo; when they leave.
            You see it live — geo-tagged, time-stamped, and synced with payroll.
            Average check-in takes under 30 seconds.
          </p>
          <div className="wa-chat">
            <div className="wa-msg user">IN</div>
            <div className="wa-msg bot">✅ Checked in at 09:02 · Andheri East office. Have a great day, Arjun!</div>
          </div>
          <div className="wa-actions">
            <Link href="/product/attendance/preview" className="btn btn-white">See it in the preview <ArrowRight /></Link>
            <Link href="/demo" className="btn btn-ghost">Book a demo</Link>
          </div>
        </div>
      </section>

      {/* ============ PREVIEW CTA ============ */}
      <section className="preview-cta">
        <div className="container">
          <div className="preview-card">
            <div className="preview-copy">
              <div className="kicker">Interactive preview</div>
              <h2>Click around the real thing.</h2>
              <p>
                Monthly grid, daily roster, weekly hours, per-employee and per-department
                views — loaded with sample data you can edit freely. Nothing to install,
                nothing saved.
              </p>
              <Link href="/product/attendance/preview" className="btn btn-primary btn-lg">Open the live preview <ArrowRight /></Link>
            </div>
            <div className="preview-points">
              {['Mark & edit any day', 'Mark all present in one click', 'Bulk CSV upload', 'Five views of the same data'].map((p) => (
                <div key={p} className="preview-point">
                  <span className="check-badge sm"><CheckIcon /></span>{p}
                </div>
              ))}
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
        .kicker.light { color: #7ea4f7; }
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
        .btn-lg { padding: 15px 28px; }

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
          padding: 88px 0 96px;
        }
        .hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; }
        .pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: #e3ecfd; color: #1d4ed8; border-radius: 999px;
          font-size: 13.5px; font-weight: 600; padding: 8px 16px; margin-bottom: 26px;
        }
        .pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #2563eb; }
        .hero h1 {
          font-size: clamp(38px, 4.6vw, 56px); line-height: 1.08;
          letter-spacing: -0.03em; font-weight: 800;
        }
        .hero-sub { margin-top: 24px; font-size: 18px; line-height: 1.65; color: #4a5468; max-width: 500px; }
        .hero-ctas { display: flex; gap: 14px; margin-top: 32px; flex-wrap: wrap; }
        .hero-note { display: flex; align-items: center; gap: 8px; margin-top: 18px; font-size: 14px; color: #5b6577; }

        /* Hero mock */
        .hero-visual { position: relative; }
        .mock {
          position: relative; background: #fff; border: 1px solid #e7ecf3;
          border-radius: 18px; padding: 22px 24px;
          box-shadow: 0 24px 60px rgba(15,30,60,0.12);
        }
        .mock-title { font-size: 13px; font-weight: 700; color: #67718a; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px; }
        .att-card { border: 1px solid #e7ecf3; border-radius: 12px; padding: 14px 16px; }
        .att-status { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
        .att-time { font-family: ui-monospace, 'SF Mono', Menlo, monospace; color: #67718a; font-size: 13px; margin-top: 6px; }
        .att-rows { margin-top: 14px; }
        .att-row { display: flex; align-items: center; gap: 11px; padding: 9px 0; border-top: 1px solid #f1f4f9; font-size: 14px; }
        .att-avatar {
          width: 32px; height: 32px; border-radius: 50%; background: #2563eb; color: #fff;
          font-size: 11.5px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .att-name { font-weight: 600; }
        .wa-tag {
          font-size: 10.5px; font-weight: 800; color: #16a34a;
          background: #dcf5e6; border: 1px solid #bfe9cf; border-radius: 6px; padding: 2px 6px;
        }
        .att-in { margin-left: auto; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #67718a; }
        .chip {
          position: absolute; background: #fff; border-radius: 14px;
          box-shadow: 0 14px 34px rgba(15,30,60,0.16);
          font-size: 13.5px; display: flex; align-items: center; gap: 9px;
        }
        .chip-leave { bottom: -20px; left: -26px; padding: 12px 18px 12px 12px; }
        .chip-check {
          width: 34px; height: 34px; border-radius: 10px; background: #22c55e;
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .chip-leave strong { display: block; font-size: 14px; }
        .chip-leave em { display: block; font-style: normal; font-size: 12.5px; color: #67718a; }

        /* Features */
        .features { padding: 110px 0; }
        .features h2 { font-size: clamp(30px, 3.6vw, 42px); font-weight: 800; letter-spacing: -0.025em; }
        .features-grid { margin-top: 48px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .feature-card {
          background: #fff; border: 1px solid #e7ecf3; border-radius: 18px; padding: 28px;
          box-shadow: 0 4px 14px rgba(15,30,60,0.04);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .feature-card:hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(15,30,60,0.1); }
        .check-badge {
          width: 30px; height: 30px; border-radius: 9px; background: #22c55e;
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .check-badge.sm { width: 24px; height: 24px; border-radius: 7px; }
        .feature-card h3 { margin-top: 18px; font-size: 17.5px; font-weight: 800; }
        .feature-card p { margin-top: 9px; font-size: 14.5px; line-height: 1.6; color: #4a5468; }

        /* WhatsApp band */
        .wa-band {
          background: radial-gradient(120% 140% at 80% 0%, #1a2c52 0%, #0b1220 60%);
          padding: 110px 0; text-align: center;
        }
        .wa-inner { max-width: 720px; }
        .wa-band h2 { color: #fff; font-size: clamp(30px, 3.6vw, 42px); font-weight: 800; letter-spacing: -0.02em; }
        .wa-band > .container > p, .wa-inner > p {
          color: #b9c3d8; font-size: 17px; line-height: 1.7; margin: 18px auto 36px; max-width: 600px;
        }
        .wa-chat { max-width: 480px; margin: 0 auto 36px; display: flex; flex-direction: column; gap: 12px; }
        .wa-msg { border-radius: 16px; padding: 13px 18px; font-size: 15px; line-height: 1.55; text-align: left; }
        .wa-msg.user {
          background: #22c55e; color: #fff; font-weight: 800; letter-spacing: 0.04em;
          align-self: flex-end; border-bottom-right-radius: 4px;
        }
        .wa-msg.bot {
          background: rgba(255,255,255,0.08); color: #dde4f0;
          border: 1px solid rgba(255,255,255,0.12);
          align-self: flex-start; border-bottom-left-radius: 4px; max-width: 92%;
        }
        .wa-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }

        /* Preview CTA */
        .preview-cta { padding: 110px 0; background: #f4f7fb; }
        .preview-card {
          background: #fff; border: 1px solid #e7ecf3; border-radius: 26px;
          padding: 56px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 48px;
          align-items: center; box-shadow: 0 18px 44px rgba(15,30,60,0.08);
        }
        .preview-copy h2 { font-size: clamp(28px, 3.2vw, 38px); font-weight: 800; letter-spacing: -0.02em; }
        .preview-copy p { margin: 16px 0 30px; font-size: 16.5px; line-height: 1.65; color: #4a5468; }
        .preview-points { display: flex; flex-direction: column; gap: 16px; }
        .preview-point { display: flex; align-items: center; gap: 12px; font-size: 15.5px; font-weight: 600; }

        /* Responsive */
        @media (max-width: 980px) {
          .hero-grid { grid-template-columns: 1fr; }
          .chip-leave { left: 0; }
          .features-grid { grid-template-columns: 1fr 1fr; }
          .preview-card { grid-template-columns: 1fr; padding: 36px; }
          .main-nav { display: none; }
        }
        @media (max-width: 560px) {
          .hero { padding-top: 56px; }
          .hero-ctas, .wa-actions { flex-direction: column; align-items: stretch; }
          .features-grid { grid-template-columns: 1fr; }
          .preview-card { padding: 26px; }
          .signin { display: none; }
        }
      ` }} />
    </div>
  );
}