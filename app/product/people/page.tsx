import Link from 'next/link';
import React from 'react';
import Footer from '@/components/Footer';

/* ============================================================
   NorthWeb Labs — People (Employees) product page
   File: app/product/people/page.tsx
   Marketing page for the People module. Links into the
   interactive preview at /product/people/preview.
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
    t: '3-step onboarding',
    d: 'Personal, job & salary, compliance & bank — a guided drawer that takes minutes, not a folder of forms.',
  },
  {
    t: 'Self-onboarding links',
    d: 'Send new hires a link and they fill in their own PAN, bank and documents before day one.',
  },
  {
    t: 'Approval workflow',
    d: 'New joiners land as pending; HR reviews and approves or rejects with one tap, fully audited.',
  },
  {
    t: 'Departments & managers',
    d: 'Reporting lines and departments captured at onboarding — your org chart builds itself.',
  },
  {
    t: 'Salary structures built in',
    d: 'Basic, HRA and allowances with live gross calculation, flowing straight into payroll.',
  },
  {
    t: 'IFSC-verified bank details',
    d: 'Type the IFSC and the bank name and branch auto-fill — no more bounced salary transfers.',
  },
];

export default function PeopleProductPage() {
  return (
    <div className="page">
      <Header />

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="pill"><i className="pill-dot" /> People</span>
            <h1>
              Every employee, one record.<br />
              <span className="accent">From offer to exit.</span>
            </h1>
            <p className="hero-sub">
              A directory your whole company trusts — profiles, departments, reporting
              lines, salary structures and compliance details, captured once during a
              guided onboarding and kept current forever.
            </p>
            <div className="hero-ctas">
              <Link href="/product/people/preview" className="btn btn-primary">Try the live preview <ArrowRight /></Link>
              <Link href="/signup" className="btn btn-outline">Start free</Link>
            </div>
            <div className="hero-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              Real product, sample data — no signup needed
            </div>
          </div>

          {/* Directory mock */}
          <div className="hero-visual">
            <div className="mock">
              <div className="mock-title">People directory</div>
              {[
                { in: 'AI', name: 'Ananya Iyer', role: 'Engineering Lead · NWL001', tag: 'Active', tagCls: 'ok' },
                { in: 'PS', name: 'Priya Sharma', role: 'Product Designer · NWL003', tag: 'Active', tagCls: 'ok' },
                { in: 'DP', name: 'Divya Pillai', role: 'UI Designer · NWL009', tag: 'Pending', tagCls: 'warn' },
              ].map((p) => (
                <div className="dir-row" key={p.in}>
                  <span className="dir-avatar">{p.in}</span>
                  <span className="dir-meta">
                    <strong>{p.name}</strong>
                    <em>{p.role}</em>
                  </span>
                  <span className={`dir-pill ${p.tagCls}`}>{p.tag}</span>
                </div>
              ))}
              <div className="dir-link">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#67718a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                <code>northweblabs.in/onboard/self?…</code>
                <span className="copy-pill">Copy</span>
              </div>
              <div className="chip chip-approved">
                <span className="chip-check"><CheckIcon /></span>
                <span>
                  <strong>Onboarding approved</strong>
                  <em>Rohan Joshi · Operations</em>
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
          <h2>Onboarding without the paperwork chase.</h2>
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

      {/* ============ FLOW BAND ============ */}
      <section className="flow-band">
        <div className="container flow-inner">
          <div className="kicker light">Day one, done right</div>
          <h2>From offer letter to first check-in, in three steps.</h2>
          <p>
            HR starts the record, the new hire completes it themselves, and a manager
            approves it — by the time they walk in, payroll, attendance and leave
            already know who they are.
          </p>
          <div className="flow-steps">
            <div className="flow-step">
              <span className="flow-num">1</span>
              <h4>Create &amp; send link</h4>
              <p>Add name and role, share the self-onboarding link on WhatsApp or email.</p>
            </div>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <div className="flow-step">
              <span className="flow-num">2</span>
              <h4>They fill the rest</h4>
              <p>PAN, Aadhaar, UAN and IFSC-verified bank details — entered once, by them.</p>
            </div>
            <span className="flow-arrow" aria-hidden="true">→</span>
            <div className="flow-step">
              <span className="flow-num">3</span>
              <h4>Approve &amp; go</h4>
              <p>One tap to approve. They&rsquo;re instantly live across payroll and attendance.</p>
            </div>
          </div>
          <div className="flow-actions">
            <Link href="/product/people/preview" className="btn btn-white">See it in the preview <ArrowRight /></Link>
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
              <h2>Onboard someone yourself, right now.</h2>
              <p>
                Ten sample employees with departments, managers and salary structures.
                Walk the 3-step onboarding drawer, approve a pending joiner, copy a
                self-onboarding link. Nothing to install, nothing saved.
              </p>
              <Link href="/product/people/preview" className="btn btn-primary btn-lg">Open the live preview <ArrowRight /></Link>
            </div>
            <div className="preview-points">
              {['Full 3-step onboarding drawer', 'Approve or reject pending joiners', 'Create departments inline', 'Search, filter and profile drawers'].map((p) => (
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
          background: #e8edf5; color: #334155; border-radius: 999px;
          font-size: 13.5px; font-weight: 600; padding: 8px 16px; margin-bottom: 26px;
        }
        .pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #334155; }
        .hero h1 {
          font-size: clamp(38px, 4.6vw, 56px); line-height: 1.08;
          letter-spacing: -0.03em; font-weight: 800;
        }
        .hero-sub { margin-top: 24px; font-size: 18px; line-height: 1.65; color: #4a5468; max-width: 520px; }
        .hero-ctas { display: flex; gap: 14px; margin-top: 32px; flex-wrap: wrap; }
        .hero-note { display: flex; align-items: center; gap: 8px; margin-top: 18px; font-size: 14px; color: #5b6577; }

        /* Directory mock */
        .hero-visual { position: relative; }
        .mock {
          position: relative; background: #fff; border: 1px solid #e7ecf3;
          border-radius: 18px; padding: 22px 24px;
          box-shadow: 0 24px 60px rgba(15,30,60,0.12);
        }
        .mock-title { font-size: 13px; font-weight: 700; color: #67718a; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; }
        .dir-row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid #f1f4f9; }
        .dir-row:first-of-type { border-top: none; }
        .dir-avatar {
          width: 38px; height: 38px; border-radius: 50%; background: #2563eb; color: #fff;
          font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dir-meta strong { display: block; font-size: 14.5px; }
        .dir-meta em { display: block; font-style: normal; font-size: 12.5px; color: #67718a; }
        .dir-pill { margin-left: auto; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 4px 11px; }
        .dir-pill.ok { color: #16a34a; background: #dcf5e6; }
        .dir-pill.warn { color: #b45309; background: #fdeed3; }
        .dir-link {
          margin-top: 14px; display: flex; align-items: center; gap: 9px;
          background: #f6f8fb; border: 1px solid #e7ecf3; border-radius: 10px; padding: 9px 12px;
        }
        .dir-link code { flex: 1; font-size: 12px; color: #67718a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .copy-pill {
          font-size: 11.5px; font-weight: 800; color: #2563eb;
          background: #e3ecfd; border-radius: 7px; padding: 4px 10px;
        }
        .chip {
          position: absolute; background: #fff; border-radius: 14px;
          box-shadow: 0 14px 34px rgba(15,30,60,0.16);
          font-size: 13.5px; display: flex; align-items: center; gap: 9px;
        }
        .chip-approved { bottom: -20px; left: -26px; padding: 12px 18px 12px 12px; }
        .chip-check {
          width: 34px; height: 34px; border-radius: 10px; background: #22c55e;
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .chip-approved strong { display: block; font-size: 14px; }
        .chip-approved em { display: block; font-style: normal; font-size: 12.5px; color: #67718a; }

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

        /* Flow band */
        .flow-band {
          background: radial-gradient(120% 140% at 80% 0%, #1a2c52 0%, #0b1220 60%);
          padding: 110px 0; text-align: center;
        }
        .flow-inner { max-width: 880px; }
        .flow-band h2 { color: #fff; font-size: clamp(28px, 3.4vw, 40px); font-weight: 800; letter-spacing: -0.02em; }
        .flow-inner > p { color: #b9c3d8; font-size: 17px; line-height: 1.7; margin: 18px auto 44px; max-width: 640px; }
        .flow-steps { display: flex; align-items: stretch; justify-content: center; gap: 14px; margin-bottom: 44px; }
        .flow-step {
          flex: 1; max-width: 240px; text-align: left;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px; padding: 22px 20px;
        }
        .flow-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 9px; background: #2563eb; color: #fff;
          font-weight: 800; font-size: 14px; margin-bottom: 14px;
        }
        .flow-step h4 { color: #fff; font-size: 16px; font-weight: 800; }
        .flow-step p { margin-top: 8px; font-size: 13.5px; line-height: 1.55; color: #b9c3d8; }
        .flow-arrow { align-self: center; color: #4a5e8a; font-size: 22px; font-weight: 700; }
        .flow-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }

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
          .chip-approved { left: 0; }
          .features-grid { grid-template-columns: 1fr 1fr; }
          .flow-steps { flex-direction: column; align-items: center; }
          .flow-step { max-width: 100%; width: 100%; }
          .flow-arrow { transform: rotate(90deg); }
          .preview-card { grid-template-columns: 1fr; padding: 36px; }
          .main-nav { display: none; }
        }
        @media (max-width: 560px) {
          .hero { padding-top: 56px; }
          .hero-ctas, .flow-actions { flex-direction: column; align-items: stretch; }
          .features-grid { grid-template-columns: 1fr; }
          .preview-card { padding: 26px; }
          .signin { display: none; }
        }
      ` }} />
    </div>
  );
}