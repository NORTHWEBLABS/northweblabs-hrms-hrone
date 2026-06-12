import Link from 'next/link';
import React from 'react';
import Footer from '@/components/Footer';

/* ============================================================
   NorthWeb Labs — Payroll & Compliance product page
   File: app/product/payroll/page.tsx
   Marketing page for the Payroll module. Links into the
   interactive preview at /product/payroll/preview.
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
    t: 'One-click payroll runs',
    d: 'Attendance and leave flow straight into pay — review the numbers, hit process, done in minutes.',
  },
  {
    t: 'PF, ESIC, PT & TDS engine',
    d: 'Statutory math computed live for every employee — slab-aware PT and new-regime TDS included.',
  },
  {
    t: 'Inline overrides',
    d: 'Click any value — days, bonus, extra allowance or deduction — and the whole slip recalculates instantly.',
  },
  {
    t: 'Payslips, self-serve',
    d: 'Beautiful salary slips employees can view and download themselves — or receive on WhatsApp.',
  },
  {
    t: 'Bank transfer sheet',
    d: 'Account-wise net payable export, ready for your bank portal or NEFT batch upload.',
  },
  {
    t: 'Employer liability tracking',
    d: 'PF and ESIC employer contributions totalled per run, with deposit deadlines surfaced upfront.',
  },
];

export default function PayrollProductPage() {
  return (
    <div className="page">
      <Header />

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="pill"><i className="pill-dot" /> Payroll &amp; compliance</span>
            <h1>
              Payroll in one click.<br />
              <span className="accent">Compliance built in.</span>
            </h1>
            <p className="hero-sub">
              Salaries, PF, ESIC, PT and TDS auto-calculated from real attendance.
              Override anything inline, process in minutes, and never miss an
              employer deposit again.
            </p>
            <div className="hero-ctas">
              <Link href="/product/payroll/preview" className="btn btn-primary">Try the live preview <ArrowRight /></Link>
              <Link href="/signup" className="btn btn-outline">Start free</Link>
            </div>
            <div className="hero-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              Real payroll engine, sample data — no signup needed
            </div>
          </div>

          {/* Mini payslip mock */}
          <div className="hero-visual">
            <div className="mock">
              <div className="mock-title">Payroll · June</div>
              <div className="pay-net">
                <span>Net payable</span>
                <strong>₹1,84,200</strong>
              </div>
              <div className="pay-lines">
                <div><span>Gross earnings</span><span>₹2,10,000</span></div>
                <div><span>PF (EE 12%)</span><span className="ded">− ₹9,400</span></div>
                <div><span>ESIC (EE 0.75%)</span><span className="ded">− ₹1,200</span></div>
                <div><span>Professional tax</span><span className="ded">− ₹2,000</span></div>
                <div><span>TDS</span><span className="ded">− ₹13,200</span></div>
              </div>
              <div className="pay-due">
                <i className="shield" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
                </i>
                Employer PF + ESIC due by 15th: ₹13,650
              </div>
              <div className="chip chip-done"><i className="chip-dot" /> Payroll run · done</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="features">
        <div className="container">
          <div className="kicker">Everything in the box</div>
          <h2>From attendance to bank transfer, handled.</h2>
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

      {/* ============ COMPLIANCE BAND ============ */}
      <section className="comp-band">
        <div className="container comp-inner">
          <div className="kicker light">Compliance on autopilot</div>
          <h2>Never miss a filing deadline again.</h2>
          <p>
            Every payroll run totals your employer PF and ESIC liability and tells you
            exactly what to deposit and by when. Slab-aware professional tax and
            new-regime TDS are computed per employee, every month, automatically.
          </p>
          <div className="comp-cards">
            <div className="comp-card">
              <span className="comp-num">12%+13%</span>
              <span className="comp-label">PF employee + employer, capped correctly</span>
            </div>
            <div className="comp-card">
              <span className="comp-num">0.75%</span>
              <span className="comp-label">ESIC applied only under the ₹21k gross limit</span>
            </div>
            <div className="comp-card">
              <span className="comp-num">₹0</span>
              <span className="comp-label">in penalties for our customers</span>
            </div>
          </div>
          <div className="comp-actions">
            <Link href="/product/payroll/preview" className="btn btn-white">See it in the preview <ArrowRight /></Link>
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
              <h2>Run a payroll yourself, right now.</h2>
              <p>
                Ten sample employees with real salary structures. Edit days, add a bonus,
                watch PF, ESIC, PT and TDS recalculate live — then process the run and
                mark it paid. Nothing to install, nothing saved.
              </p>
              <Link href="/product/payroll/preview" className="btn btn-primary btn-lg">Open the live preview <ArrowRight /></Link>
            </div>
            <div className="preview-points">
              {['Live statutory math per employee', 'Click any value to override', 'Expand rows for full CTC breakdown', 'Open and print real payslips'].map((p) => (
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
          background: #fdeed3; color: #b45309; border-radius: 999px;
          font-size: 13.5px; font-weight: 600; padding: 8px 16px; margin-bottom: 26px;
        }
        .pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #d97706; }
        .hero h1 {
          font-size: clamp(38px, 4.6vw, 56px); line-height: 1.08;
          letter-spacing: -0.03em; font-weight: 800;
        }
        .hero-sub { margin-top: 24px; font-size: 18px; line-height: 1.65; color: #4a5468; max-width: 500px; }
        .hero-ctas { display: flex; gap: 14px; margin-top: 32px; flex-wrap: wrap; }
        .hero-note { display: flex; align-items: center; gap: 8px; margin-top: 18px; font-size: 14px; color: #5b6577; }

        /* Hero payslip mock */
        .hero-visual { position: relative; }
        .mock {
          position: relative; background: #fff; border: 1px solid #e7ecf3;
          border-radius: 18px; padding: 22px 24px;
          box-shadow: 0 24px 60px rgba(15,30,60,0.12);
        }
        .mock-title { font-size: 13px; font-weight: 700; color: #67718a; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px; }
        .pay-net {
          display: flex; align-items: baseline; justify-content: space-between;
          border: 1px solid #c7d8f8; background: #eef3fe; border-radius: 12px; padding: 14px 16px;
        }
        .pay-net span { font-size: 13px; font-weight: 700; color: #1d4ed8; }
        .pay-net strong { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 26px; font-weight: 700; color: #0b1220; }
        .pay-lines { margin-top: 14px; }
        .pay-lines div { display: flex; justify-content: space-between; padding: 9px 2px; border-bottom: 1px solid #f1f4f9; color: #4a5468; font-size: 14px; }
        .pay-lines span:last-child { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
        .pay-lines .ded { color: #dc2626; }
        .pay-due {
          margin-top: 14px; display: flex; align-items: center; gap: 9px;
          font-size: 12.5px; font-weight: 600; color: #1d4ed8;
          background: #eef3fe; border: 1px solid #d6e2fb; border-radius: 10px; padding: 9px 12px;
        }
        .shield { display: inline-flex; }
        .chip {
          position: absolute; background: #fff; border-radius: 14px;
          box-shadow: 0 14px 34px rgba(15,30,60,0.16);
          font-size: 13.5px; font-weight: 600; display: flex; align-items: center; gap: 9px;
          padding: 11px 16px;
        }
        .chip-done { top: -18px; right: -22px; }
        .chip-dot { width: 9px; height: 9px; border-radius: 50%; background: #2563eb; }

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

        /* Compliance band */
        .comp-band {
          background: radial-gradient(120% 140% at 80% 0%, #1a2c52 0%, #0b1220 60%);
          padding: 110px 0; text-align: center;
        }
        .comp-inner { max-width: 760px; }
        .comp-band h2 { color: #fff; font-size: clamp(30px, 3.6vw, 42px); font-weight: 800; letter-spacing: -0.02em; }
        .comp-inner > p { color: #b9c3d8; font-size: 17px; line-height: 1.7; margin: 18px auto 40px; max-width: 640px; }
        .comp-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 40px; }
        .comp-card {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px; padding: 24px 18px;
        }
        .comp-num {
          display: block; font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 26px; font-weight: 700; color: #7ea4f7;
        }
        .comp-label { display: block; margin-top: 9px; font-size: 13.5px; line-height: 1.5; color: #b9c3d8; }
        .comp-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }

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
          .chip-done { right: 0; }
          .features-grid { grid-template-columns: 1fr 1fr; }
          .comp-cards { grid-template-columns: 1fr; }
          .preview-card { grid-template-columns: 1fr; padding: 36px; }
          .main-nav { display: none; }
        }
        @media (max-width: 560px) {
          .hero { padding-top: 56px; }
          .hero-ctas, .comp-actions { flex-direction: column; align-items: stretch; }
          .features-grid { grid-template-columns: 1fr; }
          .preview-card { padding: 26px; }
          .signin { display: none; }
        }
      ` }} />
    </div>
  );
}