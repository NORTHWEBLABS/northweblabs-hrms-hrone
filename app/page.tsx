import Footer from '@/components/Footer';
import Link from 'next/link';
import React from 'react';

/* ============================================================
   NorthWeb Labs — Marketing Landing Page
   Single-file Next.js App Router page (app/page.tsx)
   All CTAs / nav / footer items are wired as links:
     Get started / Start free  -> /signup
     Sign in                   -> /login
     Book a demo               -> /demo
     Talk to sales             -> /contact
     See it in action          -> /demo
     Explore People            -> /product/people
     Nav + footer              -> respective routes
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

const Logo = ({ light = false }: { light?: boolean }) => (
  <Link href="/" className="logo" aria-label="NorthWeb Labs home">
    <span className="logo-mark" aria-hidden="true">N</span>
    <span className={`logo-text ${light ? 'light' : ''}`}>
      NorthWeb <span className="logo-accent">Labs</span>
    </span>
  </Link>
);

/* ---------- Dashboard mockup (reused in hero + speed section) ---------- */
const DashboardMock = ({ framed = false }: { framed?: boolean }) => (
  <div className={`dash-wrap ${framed ? 'framed' : ''}`}>
    <div className="dash">
      <div className="dash-titlebar">
        <span className="dash-logo">N</span>
        <span className="dash-title">Dashboard</span>
        <span className="dash-dots">
          <i className="dot red" /><i className="dot yellow" /><i className="dot green" />
        </span>
      </div>
      <div className="dash-body">
        <div className="dash-rail">
          <span className="rail-item active" />
          <span className="rail-item" />
          <span className="rail-item" />
          <span className="rail-item" />
        </div>
        <div className="dash-main">
          <div className="dash-greeting">Good morning, Ananya</div>
          <div className="dash-pay-card">
            <div>
              <div className="pay-label">Net pay · June</div>
              <div className="pay-amount">₹1,84,200</div>
            </div>
            <div className="mini-bars" aria-hidden="true">
              {[8, 12, 16, 13, 18, 22, 19, 30].map((h, i) => (
                <span key={i} style={{ height: h }} className={i === 7 ? 'bar tall' : 'bar'} />
              ))}
            </div>
          </div>
          <div className="dash-row">
            <div className="dash-small-card">
              <div className="small-num">14 <span>days</span></div>
              <div className="pips" aria-hidden="true">
                {[1, 1, 1, 1, 0, 0, 0].map((on, i) => (
                  <span key={i} className={on ? 'pip on' : 'pip'} />
                ))}
              </div>
            </div>
            <div className="dash-small-card">
              <div className="small-label">Today</div>
              <div className="checked-in"><i className="status-dot" /> Checked in</div>
              <div className="time-range">09:02 → 18:30</div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating chips */}
      <div className="chip chip-payroll"><i className="chip-dot" /> Payroll run · done</div>
      <div className="chip chip-leave">
        <span className="chip-check"><CheckIcon /></span>
        <span>
          <strong>Leave approved</strong>
          <em>2 days · Aug</em>
        </span>
      </div>
    </div>
  </div>
);

/* ---------- Header ---------- */
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
          <Link key={n.href} href={n.href} className="nav-link">{n.label}</Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link href="/login" className="nav-link signin">Sign in</Link>
        <Link href="/signup" className="btn btn-dark">Get started <ArrowRight size={15} /></Link>
      </div>
    </div>
  </header>
);

/* ---------- Page ---------- */
export default function Page() {
  return (
    <div className="page">
      <Header />

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="pill"><i className="pill-dot" /> New · AI leave &amp; payroll assistant</span>
            <h1>
              People ops,<br />without the<br /><span className="accent">busywork.</span>
            </h1>
            <p className="hero-sub">
              Attendance, leave, payroll and performance in one calm
              workspace — so your team spends time on people,
              not paperwork.
            </p>
            <div className="hero-ctas">
              <Link href="/signup" className="btn btn-primary">Start free <ArrowRight /></Link>
              <Link href="/demo" className="btn btn-outline">Book a demo</Link>
            </div>
            <div className="hero-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              No card required · Set up in a day
            </div>
          </div>
          <div className="hero-visual">
            <DashboardMock />
          </div>
        </div>

        {/* Logo strip */}
        <div className="container logo-strip">
          <div className="strip-label">Trusted by people teams at 12,000+ companies</div>
          <div className="strip-logos">
            {['Northwind', 'Lumen', 'Atlas', 'Vertex', 'Orbit', 'Quanta'].map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ONE PLATFORM ============ */}
      <section className="platform">
        <div className="container">
          <div className="kicker">One platform</div>
          <h2>Everything HR, in one calm place.</h2>
          <p className="section-sub">
            Stop stitching together five tools. NorthWeb Labs runs the whole employee lifecycle
            from a single, fast workspace.
          </p>

          <div className="feature-grid">
            <Link href="/product/people" className="feature-card dark-card">
              <span className="icon-tile dark-tile" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </span>
              <span className="dark-card-glow" aria-hidden="true" />
              <span className="dark-card-n" aria-hidden="true">N</span>
              <div className="dark-card-body">
                <h3>A people directory your whole company loves</h3>
                <p>
                  Org chart, profiles, documents and onboarding journeys
                  — searchable, secure and always up to date.
                </p>
                <span className="text-link">Explore People <ArrowRight size={15} /></span>
              </div>
            </Link>

            <Link href="/product/attendance" className="feature-card light-card">
              <span className="icon-tile blue-tile" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              </span>
              <h3>Attendance &amp; time</h3>
              <p>Geo-aware clock-in, shifts, overtime and regularisation — all automatic.</p>
            </Link>

            <Link href="/product/leave" className="feature-card light-card">
              <span className="icon-tile green-tile" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              </span>
              <h3>Leave management</h3>
              <p>Policies, balances and approvals your team can self-serve in seconds.</p>
            </Link>

            <Link href="/product/payroll" className="feature-card light-card">
              <span className="icon-tile amber-tile" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
              </span>
              <h3>Payroll &amp; compliance</h3>
              <p>Run accurate payroll with PF, ESI and TDS handled for you.</p>
            </Link>

            <Link href="/product/performance" className="feature-card light-card">
              <span className="icon-tile indigo-tile" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="5" width="3" height="13" /></svg>
              </span>
              <h3>Performance</h3>
              <p>Goals, check-ins and reviews that actually fit how people work.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ BUILT FOR SPEED ============ */}
      <section className="speed">
        <div className="container speed-grid">
          <div className="speed-copy">
            <div className="kicker">Built for speed</div>
            <h2>The work that took days<br />now takes minutes.</h2>
            <ul className="speed-list">
              <li>
                <span className="check-badge"><CheckIcon /></span>
                <div>
                  <h4>Run payroll in minutes</h4>
                  <p>Auto-calculated salaries, taxes and payslips — approve and you&rsquo;re done.</p>
                </div>
              </li>
              <li>
                <span className="check-badge"><CheckIcon /></span>
                <div>
                  <h4>Approvals that don&rsquo;t pile up</h4>
                  <p>Leave, reimbursements and timesheets routed to the right person instantly.</p>
                </div>
              </li>
              <li>
                <span className="check-badge"><CheckIcon /></span>
                <div>
                  <h4>Reports leadership trusts</h4>
                  <p>Headcount, attrition and cost dashboards, exportable in a click.</p>
                </div>
              </li>
            </ul>
            <Link href="/demo" className="btn btn-dark btn-lg">See it in action <ArrowRight /></Link>
          </div>
          <div className="speed-visual">
            <DashboardMock framed />
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="stats" aria-label="Key statistics">
        <div className="container stats-grid">
          {[
            { num: '12k+', label: 'companies' },
            { num: '2M+', label: 'payslips run' },
            { num: '99.98%', label: 'uptime' },
            { num: '4.9 / 5', label: 'avg. rating' },
          ].map((s) => (
            <div key={s.label} className="stat">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ BUILT FOR INDIA ============ */}
      <section className="india">
        <div className="container india-inner">
          <h2>Built for how India works.</h2>
          <p className="india-sub">
            Not a US HR tool bolted onto an India compliance layer.<br />
            Built from the ground up for Indian MSMEs.
          </p>
          <div className="india-grid">
            <div className="india-card blue">
              <span className="india-pill blue">Payroll</span>
              <h3>Run payroll in minutes, not hours.</h3>
              <p>
                Auto-calculate PF, ESI, PT, and TDS. Generate
                salary slips and send them via WhatsApp. One
                click — done.
              </p>
              <div className="india-divider" />
              <div className="india-stat blue">94%</div>
              <div className="india-stat-label">reduction in payroll errors</div>
            </div>
            <div className="india-card purple">
              <span className="india-pill purple">Attendance</span>
              <h3>Your staff check in on WhatsApp.</h3>
              <p>
                No app to install. Employees send &lsquo;IN&rsquo; on
                WhatsApp and you see it live on your dashboard.
                Geo-tagged, time-stamped.
              </p>
              <div className="india-divider" />
              <div className="india-stat purple">&lt; 30s</div>
              <div className="india-stat-label">average check-in time</div>
            </div>
            <div className="india-card gray">
              <span className="india-pill gray">Compliance</span>
              <h3>Never miss a filing deadline again.</h3>
              <p>
                Auto-generated compliance calendar for PF,
                ESIC, PT, TDS, and GST. Alerts 30 days before
                every due date.
              </p>
              <div className="india-divider" />
              <div className="india-stat dark">₹0</div>
              <div className="india-stat-label">in penalties for our customers</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="cta-banner-wrap">
        <div className="container">
          <div className="cta-banner">
            <span className="banner-n n1" aria-hidden="true">N</span>
            <span className="banner-n n2" aria-hidden="true">N</span>
            <h2>Give your people team their time back.</h2>
            <p>
              Start free in minutes. No credit card, no migrations headache —
              we&rsquo;ll bring your data over.
            </p>
            <div className="cta-banner-actions">
              <Link href="/signup" className="btn btn-white">Start free <ArrowRight /></Link>
              <Link href="/contact" className="btn btn-ghost">Talk to sales</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ============ STYLES (plain global CSS — no styled-jsx registry needed) ============ */}
      <style dangerouslySetInnerHTML={{ __html: `

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #0b1220;
          background: #fff;
          -webkit-font-smoothing: antialiased;
        }
        a { text-decoration: none; color: inherit; }
        ul { list-style: none; }
      

        .page { overflow-x: hidden; }
        html, body { overflow-x: hidden; }
        .container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        .hero-grid > *, .speed-grid > * { min-width: 0; }
        .dash { max-width: 100%; }

        .kicker {
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 12px; font-weight: 700; letter-spacing: 0.22em;
          text-transform: uppercase; color: #2563eb; margin-bottom: 16px;
        }

        /* ---------- Buttons ---------- */
        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600; border-radius: 12px;
          padding: 13px 24px; cursor: pointer; border: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          white-space: nowrap;
        }
        .btn:hover { transform: translateY(-1px); }
        .btn-primary { background: #2563eb; color: #fff; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28); }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-dark { background: #0b1220; color: #fff; }
        .btn-dark:hover { background: #1a2436; }
        .btn-outline { background: #fff; color: #0b1220; border: 1px solid #dbe1ea; }
        .btn-outline:hover { border-color: #b9c3d4; }
        .btn-white { background: #fff; color: #0b1220; }
        .btn-ghost { background: transparent; color: #fff; border: 1px solid rgba(255, 255, 255, 0.45); }
        .btn-ghost:hover { background: rgba(255, 255, 255, 0.1); }
        .btn-lg { padding: 15px 28px; }

        /* ---------- Header ---------- */
        .site-header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
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
        .header-actions { margin-left: auto; display: flex; align-items: center; gap: 20px; }
        .signin { font-weight: 600; color: #0b1220; }

        /* ---------- Hero ---------- */
        .hero {
          background: linear-gradient(180deg, #fff 0%, #f4f7fb 100%);
          padding: 88px 0 72px;
        }
        .hero-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 56px; align-items: center;
        }
        .pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: #e3ecfd; color: #1d4ed8; border-radius: 999px;
          font-size: 13.5px; font-weight: 600; padding: 8px 16px; margin-bottom: 28px;
        }
        .pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #2563eb; }
        .hero h1 {
          font-size: clamp(44px, 5.5vw, 68px); line-height: 1.04;
          letter-spacing: -0.03em; font-weight: 800;
        }
        .accent { color: #2563eb; }
        .hero-sub {
          margin-top: 26px; font-size: 18px; line-height: 1.65;
          color: #4a5468; max-width: 480px;
        }
        .hero-ctas { display: flex; gap: 14px; margin-top: 34px; }
        .hero-note {
          display: flex; align-items: center; gap: 8px;
          margin-top: 20px; font-size: 14px; color: #5b6577;
        }

        /* ---------- Dashboard mock ---------- */
        .dash-wrap { position: relative; }
        .dash-wrap.framed {
          background: linear-gradient(135deg, #dde7fb 0%, #eef2fc 60%, #f6f8fe 100%);
          border-radius: 28px; padding: 44px 40px 56px 56px;
        }
        .dash {
          position: relative; background: #fff; border-radius: 16px;
          border: 1px solid #e7ecf3;
          box-shadow: 0 24px 60px rgba(15, 30, 60, 0.12);
        }
        .dash-titlebar {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 18px; border-bottom: 1px solid #eef1f6;
        }
        .dash-logo {
          width: 24px; height: 24px; border-radius: 7px; background: #0b1220;
          color: #fff; font-size: 13px; font-weight: 800;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .dash-title { font-size: 14px; font-weight: 700; }
        .dash-dots { margin-left: auto; display: flex; gap: 6px; }
        .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
        .dot.red { background: #ef4444; } .dot.yellow { background: #f59e0b; } .dot.green { background: #22c55e; }
        .dash-body { display: flex; }
        .dash-rail {
          width: 58px; border-right: 1px solid #eef1f6; padding: 18px 0;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .rail-item { width: 22px; height: 22px; border-radius: 7px; background: #e8edf5; }
        .rail-item.active { background: #2563eb; }
        .dash-main { flex: 1; padding: 18px 20px 22px; }
        .dash-greeting { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
        .dash-pay-card {
          display: flex; align-items: flex-end; justify-content: space-between;
          border: 1px solid #e7ecf3; border-radius: 12px; padding: 14px 16px;
          box-shadow: 0 6px 18px rgba(15, 30, 60, 0.05); margin-bottom: 14px;
        }
        .pay-label { font-size: 12.5px; color: #67718a; margin-bottom: 5px; }
        .pay-amount { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 26px; font-weight: 700; }
        .mini-bars { display: flex; align-items: flex-end; gap: 4px; }
        .bar { width: 6px; border-radius: 3px; background: #bcd2fb; display: inline-block; }
        .bar.tall { background: #2563eb; }
        .dash-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dash-small-card {
          border: 1px solid #e7ecf3; border-radius: 12px; padding: 12px 14px;
          box-shadow: 0 6px 18px rgba(15, 30, 60, 0.04);
        }
        .small-num { font-size: 18px; font-weight: 800; }
        .small-num span { font-size: 12px; color: #67718a; font-weight: 500; }
        .pips { display: flex; gap: 5px; margin-top: 10px; }
        .pip { width: 26px; height: 5px; border-radius: 3px; background: #e3e9f2; }
        .pip.on { background: #2563eb; }
        .small-label { font-size: 12.5px; color: #67718a; margin-bottom: 6px; }
        .checked-in { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
        .time-range { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #67718a; margin-top: 5px; }

        .chip {
          position: absolute; background: #fff; border-radius: 14px;
          box-shadow: 0 14px 34px rgba(15, 30, 60, 0.16);
          font-size: 13.5px; display: flex; align-items: center; gap: 9px;
          padding: 11px 16px;
        }
        .chip-payroll { top: 28px; right: -22px; font-weight: 600; }
        .chip-dot { width: 9px; height: 9px; border-radius: 50%; background: #2563eb; }
        .chip-leave { bottom: 86px; left: -34px; padding: 12px 18px 12px 12px; }
        .chip-check {
          width: 34px; height: 34px; border-radius: 10px; background: #22c55e;
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .chip-leave strong { display: block; font-size: 14px; }
        .chip-leave em { display: block; font-style: normal; font-size: 12.5px; color: #67718a; }

        /* ---------- Logo strip ---------- */
        .logo-strip { margin-top: 96px; text-align: center; }
        .strip-label {
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
          color: #8a93a6; margin-bottom: 28px;
        }
        .strip-logos {
          display: flex; justify-content: center; flex-wrap: wrap;
          gap: 18px 56px; font-size: 22px; font-weight: 800; color: #b6bfce;
        }

        /* ---------- Platform ---------- */
        .platform { padding: 110px 0 100px; }
        .platform h2, .speed h2 {
          font-size: clamp(34px, 4vw, 46px); font-weight: 800; letter-spacing: -0.025em;
        }
        .section-sub { margin-top: 16px; font-size: 17.5px; line-height: 1.65; color: #4a5468; max-width: 560px; }

        .feature-grid {
          margin-top: 56px; display: grid;
          grid-template-columns: 1fr 1fr; gap: 24px;
        }
        .feature-card {
          display: block; border-radius: 20px; transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .feature-card:hover { transform: translateY(-3px); }
        .light-card {
          background: #fff; border: 1px solid #e7ecf3; padding: 32px;
          box-shadow: 0 4px 14px rgba(15, 30, 60, 0.04);
        }
        .light-card:hover { box-shadow: 0 16px 36px rgba(15, 30, 60, 0.1); }
        .light-card h3 { font-size: 21px; font-weight: 800; margin: 22px 0 10px; }
        .light-card p { font-size: 15.5px; line-height: 1.6; color: #4a5468; }
        .icon-tile {
          width: 52px; height: 52px; border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .blue-tile { background: #e3ecfd; }
        .green-tile { background: #dcf5e6; }
        .amber-tile { background: #fdeed3; }
        .indigo-tile { background: #e4e4fb; }
        .dark-tile { background: rgba(255, 255, 255, 0.12); }

        .dark-card {
          grid-row: span 2; position: relative; overflow: hidden;
          background: radial-gradient(120% 120% at 85% 8%, #1a2c52 0%, #0b1220 55%);
          padding: 32px; display: flex; flex-direction: column;
          box-shadow: 0 18px 44px rgba(8, 16, 34, 0.35);
        }
        .dark-card-glow {
          position: absolute; top: -70px; right: -40px; width: 280px; height: 280px;
          border-radius: 50%; background: radial-gradient(circle, rgba(59, 110, 245, 0.5), transparent 65%);
          filter: blur(8px); pointer-events: none;
        }
        .dark-card-n {
          position: absolute; bottom: -60px; left: -16px;
          font-size: 280px; font-weight: 900; color: rgba(255, 255, 255, 0.05);
          line-height: 1; pointer-events: none; user-select: none;
        }
        .dark-card-body { margin-top: auto; position: relative; }
        .dark-card h3 { color: #fff; font-size: 27px; font-weight: 800; line-height: 1.25; max-width: 420px; }
        .dark-card p { color: #b9c3d8; font-size: 15.5px; line-height: 1.65; margin-top: 14px; max-width: 440px; }
        .text-link {
          display: inline-flex; align-items: center; gap: 7px;
          margin-top: 22px; color: #7ea4f7; font-weight: 700; font-size: 15.5px;
        }

        /* ---------- Speed ---------- */
        .speed { background: #f4f7fb; padding: 110px 0; }
        .speed-grid {
          display: grid; grid-template-columns: 1fr 1.05fr;
          gap: 64px; align-items: center;
        }
        .speed-list { margin: 38px 0 40px; display: flex; flex-direction: column; gap: 28px; }
        .speed-list li { display: flex; gap: 16px; }
        .check-badge {
          width: 30px; height: 30px; border-radius: 9px; background: #22c55e;
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
        }
        .speed-list h4 { font-size: 17.5px; font-weight: 800; margin-bottom: 5px; }
        .speed-list p { font-size: 15.5px; line-height: 1.6; color: #4a5468; }

        /* ---------- Stats ---------- */
        .stats {
          background: #0b1220;
          background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 26px 26px;
          padding: 84px 0;
        }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; text-align: center; }
        .stat-num {
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: clamp(34px, 4vw, 48px); font-weight: 700; color: #fff;
        }
        .stat-label { margin-top: 10px; font-size: 15px; color: #94a0b8; }

        /* ---------- Built for India ---------- */
        .india { background: #fff; padding: 120px 0; }
        .india-inner { text-align: center; }
        .india h2 { font-size: clamp(32px, 4vw, 46px); font-weight: 800; letter-spacing: -0.025em; }
        .india-sub { margin: 18px auto 0; font-size: 17.5px; line-height: 1.7; color: #8a93a6; }
        .india-grid {
          margin-top: 56px; display: grid;
          grid-template-columns: repeat(3, 1fr); gap: 26px; text-align: left;
        }
        .india-card { border-radius: 20px; padding: 32px 30px 34px; }
        .india-card.blue { background: #eef5fd; }
        .india-card.purple { background: #ecedfb; }
        .india-card.gray { background: #f5f6f8; }
        .india-pill {
          display: inline-block; font-size: 13px; font-weight: 700;
          border-radius: 999px; padding: 5px 14px;
        }
        .india-pill.blue { background: #dbeafe; color: #2563eb; }
        .india-pill.purple { background: #e3e3fb; color: #6d5ce8; }
        .india-pill.gray { background: #e3e5e9; color: #3b4456; }
        .india-card h3 { margin-top: 22px; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
        .india-card p { margin-top: 13px; font-size: 15.5px; line-height: 1.65; color: #5b6577; }
        .india-divider { margin: 26px 0 22px; height: 1px; background: rgba(11, 18, 32, 0.08); }
        .india-stat { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 38px; font-weight: 700; }
        .india-stat.blue { color: #2563eb; }
        .india-stat.purple { color: #6d5ce8; }
        .india-stat.dark { color: #0b1220; }
        .india-stat-label { margin-top: 6px; font-size: 14px; color: #8a93a6; }

        /* ---------- CTA banner ---------- */
        .cta-banner-wrap { padding: 40px 0 110px; background: #fff; }
        .cta-banner {
          position: relative; overflow: hidden; text-align: center;
          background: linear-gradient(120deg, #2057e0 0%, #3b6ef5 60%, #5b85f7 100%);
          border-radius: 28px; padding: 86px 32px;
          box-shadow: 0 28px 60px rgba(37, 99, 235, 0.35);
        }
        .banner-n {
          position: absolute; font-weight: 900; color: rgba(255, 255, 255, 0.12);
          line-height: 0.8; pointer-events: none; user-select: none;
        }
        .n1 { font-size: 320px; top: -60px; left: -30px; }
        .n2 { font-size: 260px; bottom: -80px; right: -20px; }
        .cta-banner h2 {
          color: #fff; font-size: clamp(32px, 4vw, 46px);
          font-weight: 800; letter-spacing: -0.02em; position: relative;
        }
        .cta-banner p {
          color: rgba(255, 255, 255, 0.88); font-size: 17.5px; line-height: 1.6;
          margin: 18px auto 36px; max-width: 520px; position: relative;
        }
        .cta-banner-actions { display: flex; justify-content: center; gap: 14px; position: relative; }

        /* ---------- Footer ---------- */
        .footer { background: #0b1220; color: #aab3c5; padding: 78px 0 36px; }
        .footer-grid {
          display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 40px;
        }
        .footer-brand p { margin-top: 20px; font-size: 15px; line-height: 1.7; }
        .footer-col { display: flex; flex-direction: column; gap: 13px; }
        .footer-col h5 {
          color: #fff; font-size: 14.5px; font-weight: 700; margin-bottom: 6px;
        }
        .footer-col a { font-size: 14.5px; color: #aab3c5; transition: color 0.15s; }
        .footer-col a:hover { color: #fff; }
        .footer-bottom {
          margin-top: 64px; padding-top: 28px; border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
        }
        .footer-copy { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #7e8aa0; }
        .footer-legal { display: flex; gap: 24px; }
        .footer-legal a { font-size: 13.5px; color: #aab3c5; }
        .footer-legal a:hover { color: #fff; }

        /* ---------- Responsive ---------- */
        @media (max-width: 980px) {
          .hero { padding: 64px 0 56px; }
          .hero-grid, .speed-grid { grid-template-columns: 1fr; gap: 40px; }
          .hero-visual { margin-top: 28px; }
          /* keep floating chips fully INSIDE the card on small screens */
          .chip-payroll { right: 12px; top: 12px; }
          .chip-leave { left: 12px; bottom: 12px; }
          .dash-wrap.framed { padding: 28px 22px 38px; }
          .feature-grid { grid-template-columns: 1fr; }
          .dark-card { grid-row: auto; min-height: 380px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 44px 24px; }
          .india-grid { grid-template-columns: 1fr; }
          .footer-grid { grid-template-columns: 1fr 1fr; }
          .main-nav { display: none; }
          .platform { padding: 80px 0 72px; }
          .speed { padding: 80px 0; }
          .india { padding: 84px 0; }
          .logo-strip { margin-top: 64px; }
        }
        @media (max-width: 560px) {
          .container { padding: 0 18px; }
          .header-inner { gap: 16px; height: 64px; }
          .header-actions { gap: 12px; }
          .header-actions .btn { padding: 10px 16px; font-size: 14px; }
          .signin { display: none; }

          .hero { padding: 44px 0 48px; }
          .hero h1 { font-size: clamp(33px, 9.5vw, 42px); }
          .hero-sub { font-size: 16.5px; }
          .hero-ctas, .cta-banner-actions { flex-direction: column; align-items: stretch; }

          /* dashboard mock: scale internals so min-content fits ~320px */
          .dash-wrap.framed { padding: 16px 12px 24px; }
          .dash-rail { width: 44px; }
          .dash-main { padding: 14px 13px 16px; }
          .dash-pay-card { padding: 12px 13px; }
          .pay-amount { font-size: 21px; }
          .bar { width: 5px; }
          .dash-row { gap: 10px; }
          .pip { width: 18px; }
          .chip { font-size: 12px; padding: 8px 12px; box-shadow: 0 10px 24px rgba(15, 30, 60, 0.16); }
          .chip-leave { padding: 9px 13px 9px 9px; }
          .chip-leave strong { font-size: 12.5px; }
          .chip-leave em { font-size: 11.5px; }
          .chip-check { width: 28px; height: 28px; }

          .logo-strip { margin-top: 52px; }
          .strip-logos { gap: 14px 28px; font-size: 17px; }
          .platform { padding: 64px 0 56px; }
          .speed { padding: 64px 0; }
          .stats { padding: 60px 0; }
          .india { padding: 64px 0; }
          .india-stat { font-size: 32px; }
          .light-card, .dark-card, .india-card { padding: 26px 22px 28px; }
          .cta-banner-wrap { padding: 24px 0 72px; }
          .cta-banner { padding: 56px 22px; border-radius: 22px; }
          .n1 { font-size: 190px; top: -40px; left: -24px; }
          .n2 { font-size: 150px; bottom: -50px; right: -16px; }
          .footer { padding: 56px 0 30px; }
          .footer-bottom { margin-top: 44px; }
        }
        @media (max-width: 380px) {
          .dash-row { grid-template-columns: 1fr; }
          .mini-bars { display: none; }
        }
      
      ` }} />
    </div>
  );
}