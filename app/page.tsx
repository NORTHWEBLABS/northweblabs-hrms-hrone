import Footer from '@/components/Footer';
import Link from 'next/link';
import React from 'react';

/* ============================================================
   NorthWeb Labs — Marketing Landing Page  (app/page.tsx)
   ============================================================ */

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const CheckIcon = ({ color = '#fff' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Logo = ({ light = false }: { light?: boolean }) => (
  <Link href="/" className="logo" aria-label="NorthWeb Labs home">
    <img src="/logo-nwl.png" alt="" className="logo-mark-img" aria-hidden="true" />
    <span className={`logo-text ${light ? 'light' : ''}`}>
      NorthWeb <span className="logo-accent">Labs</span>
    </span>
  </Link>
);

/* ---------- Hero product mock (pure CSS, responsive) ---------- */
const CHART = [
  { m: 'Nov', h: 46 }, { m: 'Dec', h: 60 }, { m: 'Jan', h: 54 }, { m: 'Feb', h: 76 },
  { m: 'Mar', h: 66 }, { m: 'Apr', h: 88 }, { m: 'May', h: 106 },
];

const HeroMock = () => (
  <div className="hero-stage">
    {/* Main: People overview */}
    <div className="pm-card">
      <div className="pm-head">
        <span className="pm-title">People overview</span>
        <span className="pm-period">MAY 2026</span>
      </div>
      <div className="pm-stats">
        <div className="pm-stat">
          <div className="pm-stat-label">Headcount</div>
          <div className="pm-stat-num">247</div>
          <div className="pm-stat-sub"><b>+12</b> this mo</div>
        </div>
        <div className="pm-stat">
          <div className="pm-stat-label">Active</div>
          <div className="pm-stat-num">231</div>
          <div className="pm-stat-sub">93.5%</div>
        </div>
        <div className="pm-stat">
          <div className="pm-stat-label">Onboarding</div>
          <div className="pm-stat-num">7</div>
          <div className="pm-stat-sub"><b>+4</b> Mon</div>
        </div>
      </div>
      <div className="pm-chart" aria-hidden="true">
        {CHART.map((b, i) => (
          <div className="pm-col" key={b.m}>
            <span className={i === CHART.length - 1 ? 'pm-bar tall' : 'pm-bar'} style={{ height: b.h }} />
            <span className="pm-col-label">{b.m}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Floating: people online */}
    <div className="fc fc-online">
      <div className="avatars" aria-hidden="true">
        <span className="av av1">AM</span><span className="av av2">SK</span><span className="av av3">PN</span><span className="av av4">MT</span>
      </div>
      <span className="fc-online-text"><b>+243</b> people online</span>
    </div>

    {/* Floating: payroll approved */}
    <div className="fc fc-payroll">
      <span className="fc-check"><CheckIcon color="#16a34a" /></span>
      <div>
        <div className="fc-payroll-title">Payroll run · approved</div>
        <div className="fc-payroll-sub">₹4.21 Cr · 247 payslips sent</div>
      </div>
    </div>

    {/* Floating dark pills */}
    <div className="pill-dark pill-uptime"><i className="pd-dot green" /> 99.99% uptime</div>
    <div className="pill-dark pill-countries"><i className="pd-dot blue" /> 175 countries</div>

    {/* Performance review card */}
    <div className="perf-card">
      <div className="perf-kicker">Performance · H1 2026</div>
      <div className="perf-head">
        <span className="perf-av">AM</span>
        <div className="perf-id"><b>Aarav Mehta</b><span>Review completed</span></div>
        <span className="perf-badge">4.6 Outstanding</span>
      </div>
      <div className="perf-rows">
        <div className="perf-row"><span>Outstanding</span><div className="perf-bar"><i style={{ width: '88%' }} /></div></div>
        <div className="perf-row"><span>Exceeds</span><div className="perf-bar"><i style={{ width: '60%' }} /></div></div>
        <div className="perf-row"><span>Meets</span><div className="perf-bar"><i style={{ width: '40%' }} /></div></div>
      </div>
    </div>
  </div>
);

/* ---------- Header ---------- */
const NAV = [
  { label: 'Product', href: '/product' },
  { label: 'Pricing', href: '/pricing' },
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
            <span className="pill"><i className="pill-dot" /> New · Per-employee work schedules &amp; weekly-offs</span>
            <h1>
              People ops,<br />without the<br /><span className="accent">busywork.</span>
            </h1>
            <p className="hero-sub">
              Attendance, leave, payroll and approvals in one calm
              workspace — so your team spends time on people,
              not paperwork.
            </p>
            <div className="hero-ctas">
              <Link href="/signup" className="btn btn-primary">Start free <ArrowRight /></Link>
              <Link href="/demo" className="btn btn-outline">Book a demo</Link>
            </div>
            <div className="hero-note">
              <CheckIcon color="#16a34a" /> No card required · Set up in a day
            </div>
          </div>
          <div className="hero-visual">
            <HeroMock />
          </div>
        </div>

        {/* Module strip */}
        <div className="container logo-strip">
          <div className="strip-label">One workspace for the whole employee lifecycle</div>
          <div className="strip-logos">
            {['People', 'Attendance', 'Leave', 'Payroll', 'Approvals', 'Schedules'].map((c) => (
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
              <div className="dark-card-body">
                <h3>A people directory your whole company loves</h3>
                <p>
                  Profiles, roles and self-serve onboarding — with
                  role-based access so everyone sees exactly what
                  they should.
                </p>
                <span className="text-link">Explore People <ArrowRight size={15} /></span>
              </div>
            </Link>

            <Link href="/product/attendance" className="feature-card light-card">
              <span className="icon-tile blue-tile" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              </span>
              <h3>Attendance &amp; schedules</h3>
              <p>Geo-tagged check-in, monthly grids, and weekly-off policies per employee.</p>
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
              <h3>Payroll &amp; payslips</h3>
              <p>Generate payslips, track net pay and let employees download their own.</p>
            </Link>

            <Link href="/signup" className="feature-card light-card">
              <span className="icon-tile indigo-tile" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H5.2L4 17.2V4z" /><path d="m9 9 2 2 4-4" /></svg>
              </span>
              <h3>Approvals &amp; reimbursements</h3>
              <p>Leave and expense claims routed to the right approver, with email and in-app alerts.</p>
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
                  <h4>Payslips in minutes</h4>
                  <p>Generate payslips and net pay, then approve &mdash; done.</p>
                </div>
              </li>
              <li>
                <span className="check-badge"><CheckIcon /></span>
                <div>
                  <h4>Approvals that don&rsquo;t pile up</h4>
                  <p>Leave and reimbursements routed to the right person instantly.</p>
                </div>
              </li>
              <li>
                <span className="check-badge"><CheckIcon /></span>
                <div>
                  <h4>Reports leadership trusts</h4>
                  <p>Expense, attendance and cost views you can filter by date range.</p>
                </div>
              </li>
            </ul>
            <Link href="/demo" className="btn btn-dark btn-lg">See it in action <ArrowRight /></Link>
          </div>
          <div className="speed-visual">
            <HeroMock />
          </div>
        </div>
      </section>

      {/* ============ WHAT'S INSIDE ============ */}
      <section className="stats" aria-label="What's inside">
        <div className="container stats-grid">
          {[
            { num: '6', label: 'roles · owner to employee' },
            { num: 'Geo', label: 'location-tagged check-in' },
            { num: '1', label: 'workspace for HR ops' },
            { num: '100%', label: 'self-serve for employees' },
          ].map((s) => (
            <div key={s.label} className="stat">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="cta-banner-wrap">
        <div className="container">
          <div className="cta-banner">
            <h2>Give your people team their time back.</h2>
            <p>
              Start free in minutes. No credit card, no setup headache &mdash;
              add your team and go.
            </p>
            <div className="cta-banner-actions">
              <Link href="/signup" className="btn btn-white">Start free <ArrowRight /></Link>
              <Link href="/contact" className="btn btn-ghost">Talk to sales</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ============ STYLES ============ */}
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
        html, body { overflow-x: hidden; }
        .container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        .hero-grid > *, .speed-grid > * { min-width: 0; }

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
        .logo-mark-img { width: 36px; height: 36px; border-radius: 10px; object-fit: contain; display: block; }
        .logo-text { font-weight: 800; font-size: 18px; color: #0b1220; }
        .logo-text.light { color: #fff; }
        .logo-accent { color: #2563eb; }
        .main-nav { display: flex; gap: 28px; }
        .nav-link { font-size: 15px; font-weight: 500; color: #3b4456; transition: color 0.15s; }
        .nav-link:hover { color: #0b1220; }
        .header-actions { margin-left: auto; display: flex; align-items: center; gap: 20px; }
        .signin { font-weight: 600; color: #0b1220; }

        /* ---------- Hero ---------- */
        .hero { background: linear-gradient(180deg, #fff 0%, #f4f7fb 100%); padding: 88px 0 72px; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: #e3ecfd; color: #1d4ed8; border-radius: 999px;
          font-size: 13.5px; font-weight: 600; padding: 8px 16px; margin-bottom: 28px;
        }
        .pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #2563eb; }
        .hero h1 { font-size: clamp(44px, 5.5vw, 68px); line-height: 1.04; letter-spacing: -0.03em; font-weight: 800; }
        .accent { color: #2563eb; }
        .hero-sub { margin-top: 26px; font-size: 18px; line-height: 1.65; color: #4a5468; max-width: 480px; }
        .hero-ctas { display: flex; gap: 14px; margin-top: 34px; }
        .hero-note { display: flex; align-items: center; gap: 8px; margin-top: 20px; font-size: 14px; color: #5b6577; }

        /* ---------- Hero mock (CSS) ---------- */
        .hero-stage {
          position: relative; max-width: 520px; margin: 0 auto; min-height: 570px;
          border-radius: 24px; overflow: hidden; background: #0b1220;
          box-shadow: 0 30px 70px rgba(8, 16, 34, 0.45);
        }
        .hero-stage::before {
          content: ''; position: absolute; inset: 0; z-index: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .hero-stage::after {
          content: ''; position: absolute; top: -120px; right: -80px; width: 340px; height: 340px;
          border-radius: 50%; background: radial-gradient(circle, rgba(59, 110, 245, 0.45), transparent 60%); z-index: 0;
        }
        .hero-stage > * { position: absolute; z-index: 1; }

        .pm-card {
          top: 96px; left: 36px; right: 20px; z-index: 1;
          background: #fff; border-radius: 18px; padding: 22px;
          box-shadow: 0 18px 44px rgba(8, 16, 34, 0.3);
        }
        .pm-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .pm-title { font-size: 18px; font-weight: 800; color: #0b1220; }
        .pm-period { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; letter-spacing: 0.14em; color: #9aa3b5; }
        .pm-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .pm-stat { border: 1px solid #eef1f6; border-radius: 12px; padding: 12px 14px; }
        .pm-stat-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #9aa3b5; }
        .pm-stat-num { font-size: 28px; font-weight: 800; color: #0b1220; line-height: 1.1; margin-top: 4px; }
        .pm-stat-sub { font-size: 12px; color: #67718a; margin-top: 4px; }
        .pm-stat-sub b { color: #16a34a; font-weight: 700; }
        .pm-chart { display: flex; align-items: flex-end; gap: 10px; height: 140px; margin-top: 18px; }
        .pm-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; height: 100%; }
        .pm-bar { width: 100%; border-radius: 8px 8px 4px 4px; background: #eef1fb; }
        .pm-bar.tall { background: linear-gradient(180deg, #3b6ef5, #2563eb); box-shadow: 0 8px 18px rgba(37, 99, 235, 0.3); }
        .pm-col-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10px; letter-spacing: 0.08em; color: #9aa3b5; }

        .fc {
          background: #fff; border-radius: 16px; display: flex; align-items: center; gap: 12px;
          padding: 12px 18px; box-shadow: 0 16px 40px rgba(8, 16, 34, 0.22);
        }
        .fc-online { top: 30px; left: 14px; z-index: 2; }
        .avatars { display: flex; }
        .av { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: #fff; border: 2px solid #fff; margin-left: -8px; }
        .av:first-child { margin-left: 0; }
        .av1 { background: #2563eb; } .av2 { background: #0b1220; } .av3 { background: #7c5cff; } .av4 { background: #1f9d57; }
        .fc-online-text { font-size: 15px; color: #0b1220; }
        .fc-online-text b { font-weight: 800; }

        .fc-payroll { top: 0; right: 6px; z-index: 2; }
        .fc-check { width: 34px; height: 34px; border-radius: 10px; background: #dcfce7; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fc-payroll-title { font-size: 15px; font-weight: 800; color: #0b1220; }
        .fc-payroll-sub { font-size: 12.5px; color: #67718a; margin-top: 2px; }

        .pill-dark {
          z-index: 2; display: flex; align-items: center; gap: 8px;
          background: rgba(13, 20, 34, 0.72); border: 1px solid rgba(255, 255, 255, 0.14);
          color: #e5e9f2; font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 13px; letter-spacing: 0.03em; padding: 9px 14px; border-radius: 10px;
        }
        .pd-dot { width: 7px; height: 7px; border-radius: 50%; }
        .pd-dot.green { background: #22c55e; } .pd-dot.blue { background: #3b6ef5; }
        .pill-uptime { top: 334px; right: 2px; }
        .pill-countries { bottom: 36px; right: 16px; }

        .perf-card {
          bottom: 6px; left: 4px; width: 300px; z-index: 3;
          background: #fff; border-radius: 18px; padding: 20px;
          box-shadow: 0 20px 50px rgba(8, 16, 34, 0.28);
        }
        .perf-kicker { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #9aa3b5; }
        .perf-head { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
        .perf-av { width: 42px; height: 42px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
        .perf-id b { display: block; font-size: 16px; font-weight: 800; color: #0b1220; }
        .perf-id span { font-size: 13px; color: #67718a; }
        .perf-badge { margin-left: auto; background: #dcfce7; color: #16a34a; font-weight: 700; font-size: 13px; padding: 6px 12px; border-radius: 999px; white-space: nowrap; }
        .perf-rows { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
        .perf-row { display: flex; align-items: center; gap: 12px; }
        .perf-row > span { width: 84px; font-size: 13px; color: #5b6577; }
        .perf-bar { flex: 1; height: 8px; border-radius: 6px; background: #eef1f6; overflow: hidden; }
        .perf-bar i { display: block; height: 100%; border-radius: 6px; background: #cdd6e6; }
        .perf-row:first-child .perf-bar i { background: #86efac; }

        /* ---------- Module strip ---------- */
        .logo-strip { margin-top: 96px; text-align: center; }
        .strip-label {
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
          color: #8a93a6; margin-bottom: 28px;
        }
        .strip-logos { display: flex; justify-content: center; flex-wrap: wrap; gap: 18px 56px; font-size: 22px; font-weight: 800; color: #b6bfce; }

        /* ---------- Platform ---------- */
        .platform { padding: 110px 0 100px; }
        .platform h2, .speed h2 { font-size: clamp(34px, 4vw, 46px); font-weight: 800; letter-spacing: -0.025em; }
        .section-sub { margin-top: 16px; font-size: 17.5px; line-height: 1.65; color: #4a5468; max-width: 560px; }
        .feature-grid { margin-top: 56px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .feature-card { display: block; border-radius: 20px; transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .feature-card:hover { transform: translateY(-3px); }
        .light-card { background: #fff; border: 1px solid #e7ecf3; padding: 32px; box-shadow: 0 4px 14px rgba(15, 30, 60, 0.04); }
        .light-card:hover { box-shadow: 0 16px 36px rgba(15, 30, 60, 0.1); }
        .light-card h3 { font-size: 21px; font-weight: 800; margin: 22px 0 10px; }
        .light-card p { font-size: 15.5px; line-height: 1.6; color: #4a5468; }
        .icon-tile { width: 52px; height: 52px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; }
        .blue-tile { background: #e3ecfd; } .green-tile { background: #dcf5e6; } .amber-tile { background: #fdeed3; } .indigo-tile { background: #e4e4fb; } .dark-tile { background: rgba(255, 255, 255, 0.12); }
        .dark-card {
          grid-row: span 2; position: relative; overflow: hidden;
          background: radial-gradient(120% 120% at 85% 8%, #1a2c52 0%, #0b1220 55%);
          padding: 32px; display: flex; flex-direction: column; box-shadow: 0 18px 44px rgba(8, 16, 34, 0.35);
        }
        .dark-card-glow { position: absolute; top: -70px; right: -40px; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(59, 110, 245, 0.5), transparent 65%); filter: blur(8px); pointer-events: none; }
        .dark-card-body { margin-top: auto; position: relative; }
        .dark-card h3 { color: #fff; font-size: 27px; font-weight: 800; line-height: 1.25; max-width: 420px; }
        .dark-card p { color: #b9c3d8; font-size: 15.5px; line-height: 1.65; margin-top: 14px; max-width: 440px; }
        .text-link { display: inline-flex; align-items: center; gap: 7px; margin-top: 22px; color: #7ea4f7; font-weight: 700; font-size: 15.5px; }

        /* ---------- Speed ---------- */
        .speed { background: #f4f7fb; padding: 110px 0; }
        .speed-grid { display: grid; grid-template-columns: 1fr 1.05fr; gap: 64px; align-items: center; }
        .speed-list { margin: 38px 0 40px; display: flex; flex-direction: column; gap: 28px; }
        .speed-list li { display: flex; gap: 16px; }
        .check-badge { width: 30px; height: 30px; border-radius: 9px; background: #22c55e; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .speed-list h4 { font-size: 17.5px; font-weight: 800; margin-bottom: 5px; }
        .speed-list p { font-size: 15.5px; line-height: 1.6; color: #4a5468; }

        /* ---------- What's inside ---------- */
        .stats {
          background: #0b1220;
          background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 26px 26px; padding: 84px 0;
        }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; text-align: center; }
        .stat-num { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: clamp(34px, 4vw, 48px); font-weight: 700; color: #fff; }
        .stat-label { margin-top: 10px; font-size: 15px; color: #94a0b8; }

        /* ---------- CTA banner ---------- */
        .cta-banner-wrap { padding: 110px 0; background: #fff; }
        .cta-banner {
          position: relative; overflow: hidden; text-align: center;
          background: linear-gradient(120deg, #2057e0 0%, #3b6ef5 60%, #5b85f7 100%);
          border-radius: 28px; padding: 86px 32px; box-shadow: 0 28px 60px rgba(37, 99, 235, 0.35);
        }
        .cta-banner h2 { color: #fff; font-size: clamp(32px, 4vw, 46px); font-weight: 800; letter-spacing: -0.02em; position: relative; }
        .cta-banner p { color: rgba(255, 255, 255, 0.88); font-size: 17.5px; line-height: 1.6; margin: 18px auto 36px; max-width: 520px; position: relative; }
        .cta-banner-actions { display: flex; justify-content: center; gap: 14px; position: relative; }

        /* ---------- Footer (component) ---------- */
        .footer { background: #0b1220; color: #aab3c5; padding: 78px 0 36px; }
        .footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 40px; }
        .footer-brand p { margin-top: 20px; font-size: 15px; line-height: 1.7; }
        .footer-col { display: flex; flex-direction: column; gap: 13px; }
        .footer-col h5 { color: #fff; font-size: 14.5px; font-weight: 700; margin-bottom: 6px; }
        .footer-col a { font-size: 14.5px; color: #aab3c5; transition: color 0.15s; }
        .footer-col a:hover { color: #fff; }
        .footer-bottom { margin-top: 64px; padding-top: 28px; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
        .footer-copy { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #7e8aa0; }
        .footer-legal { display: flex; gap: 24px; }
        .footer-legal a { font-size: 13.5px; color: #aab3c5; }
        .footer-legal a:hover { color: #fff; }

        /* ---------- Responsive ---------- */
        @media (max-width: 980px) {
          .hero { padding: 64px 0 56px; }
          .hero-grid, .speed-grid { grid-template-columns: 1fr; gap: 40px; }
          .hero-visual { margin-top: 20px; }
          .feature-grid { grid-template-columns: 1fr; }
          .dark-card { grid-row: auto; min-height: 380px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 44px 24px; }
          .footer-grid { grid-template-columns: 1fr 1fr; }
          .main-nav { display: none; }
          .platform { padding: 80px 0 72px; }
          .speed { padding: 80px 0; }
          .cta-banner-wrap { padding: 80px 0; }
          .logo-strip { margin-top: 64px; }
        }

        /* Hero mock collapses to a clean vertical stack on phones */
        @media (max-width: 640px) {
          .hero-stage { min-height: 0; padding: 18px; display: flex; flex-direction: column; gap: 14px; max-width: 420px; }
          .hero-stage > * { position: static !important; }
          .pm-card { order: 2; }
          .fc-payroll { order: 1; align-self: flex-start; }
          .perf-card { order: 3; width: auto; }
          .fc-online, .pill-dark { display: none; }
          .pm-chart { height: 110px; }
        }

        @media (max-width: 560px) {
          .container { padding: 0 18px; }
          .header-inner { gap: 16px; height: 64px; }
          .header-actions { gap: 12px; }
          .header-actions .btn { padding: 10px 16px; font-size: 14px; }
          .signin { display: none; }
          .hero { padding: 40px 0 44px; }
          .hero h1 { font-size: clamp(33px, 9.5vw, 42px); }
          .hero-sub { font-size: 16.5px; }
          .hero-ctas, .cta-banner-actions { flex-direction: column; align-items: stretch; }
          .logo-strip { margin-top: 48px; }
          .strip-logos { gap: 14px 28px; font-size: 17px; }
          .platform { padding: 60px 0 52px; }
          .speed { padding: 60px 0; }
          .stats { padding: 56px 0; }
          .light-card, .dark-card { padding: 26px 22px 28px; }
          .cta-banner-wrap { padding: 56px 0; }
          .cta-banner { padding: 52px 22px; border-radius: 22px; }
          .footer { padding: 56px 0 30px; }
        }
      ` }} />
    </div>
  );
}