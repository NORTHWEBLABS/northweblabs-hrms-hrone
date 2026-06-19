import Footer from '@/components/Footer';
import Link from 'next/link';
import React from 'react';

/* ============================================================
   NorthWeb Labs — Marketing Landing Page  (app/page.tsx)
   Desktop hero = light split (People overview card).
   Mobile hero  = dark centered ("Watch demo").
   ============================================================ */

const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
  </svg>
);

const CheckIcon = ({ color = '#fff' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const PlayIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);

const Logo = () => (
  <Link href="/" className="logo" aria-label="NorthWeb Labs home">
    <img src="/logo-nwl.png" alt="" className="logo-mark-img" aria-hidden="true" />
    <span className="logo-text">NorthWeb <span className="logo-accent">Labs</span></span>
  </Link>
);

const CHART = [
  { m: 'Nov', h: 46 }, { m: 'Dec', h: 60 }, { m: 'Jan', h: 54 }, { m: 'Feb', h: 76 },
  { m: 'Mar', h: 66 }, { m: 'Apr', h: 88 }, { m: 'May', h: 106 },
];

/* People overview card — desktop hero visual */
const PeopleCard = () => (
  <div className="people-card">
    <div className="pm-head">
      <span className="pm-title">People overview</span>
      <span className="pm-period">MAY 2026</span>
    </div>
    <div className="pm-stats">
      <div className="pm-stat">
        <div className="pm-stat-label">Headcount</div>
        <div className="pm-stat-num">247</div>
        <div className="pm-stat-sub"><b>+12</b></div>
      </div>
      <div className="pm-stat">
        <div className="pm-stat-label">Active</div>
        <div className="pm-stat-num">231</div>
        <div className="pm-stat-sub">93%</div>
      </div>
      <div className="pm-stat">
        <div className="pm-stat-label">Onboarding</div>
        <div className="pm-stat-num">7</div>
        <div className="pm-stat-sub"><b>+4</b></div>
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
);

/* Old dashboard mock — kept for the speed section */
const DashboardMock = ({ framed = false }: { framed?: boolean }) => (
  <div className={`dash-wrap ${framed ? 'framed' : ''}`}>
    <div className="dash">
      <div className="dash-titlebar">
        <img src="/logo-nwl.png" alt="" className="dash-logo" aria-hidden="true" />
        <span className="dash-title">Dashboard</span>
        <span className="dash-dots"><i className="dot red" /><i className="dot yellow" /><i className="dot green" /></span>
      </div>
      <div className="dash-body">
        <div className="dash-rail">
          <span className="rail-item active" /><span className="rail-item" /><span className="rail-item" /><span className="rail-item" />
        </div>
        <div className="dash-main">
          <div className="dash-greeting">Good morning, Ananya</div>
          <div className="dash-pay-card">
            <div>
              <div className="pay-label">Net pay · June</div>
              <div className="pay-amount">₹1,84,200</div>
            </div>
            <div className="mini-bars" aria-hidden="true">
              {[8, 12, 16, 13, 18, 22, 19, 30].map((h, i) => (<span key={i} style={{ height: h }} className={i === 7 ? 'bar tall' : 'bar'} />))}
            </div>
          </div>
          <div className="dash-row">
            <div className="dash-small-card">
              <div className="small-num">14 <span>days</span></div>
              <div className="pips" aria-hidden="true">{[1, 1, 1, 1, 0, 0, 0].map((on, i) => (<span key={i} className={on ? 'pip on' : 'pip'} />))}</div>
            </div>
            <div className="dash-small-card">
              <div className="small-label">Today</div>
              <div className="checked-in"><i className="status-dot" /> Checked in</div>
              <div className="time-range">09:02 → 18:30</div>
            </div>
          </div>
        </div>
      </div>
      <div className="chip chip-payroll"><i className="chip-dot" /> Payslip · ready</div>
      <div className="chip chip-leave">
        <span className="chip-check"><CheckIcon /></span>
        <span><strong>Leave approved</strong><em>2 days · Aug</em></span>
      </div>
    </div>
  </div>
);

const NAV = [
  { label: 'Product', href: '/product' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Customers', href: '/customers' },
];

const Header = () => (
  <header className="site-header">
    <div className="container header-inner">
      <Logo />
      <nav className="main-nav" aria-label="Main">
        {NAV.map((n) => (<Link key={n.href} href={n.href} className="nav-link">{n.label}</Link>))}
      </nav>
      <div className="header-actions">
        <Link href="/login" className="nav-link signin">Sign in</Link>
        <Link href="/signup" className="btn btn-primary btn-sm">Start free</Link>
      </div>
    </div>
  </header>
);

export default function Page() {
  return (
    <div className="page">
      <Header />

      {/* ============ HERO — DESKTOP (light, split) ============ */}
      <section className="hero-d">
        <div className="container hero-d-grid">
          <div className="hero-d-copy">
            <span className="pill-light"><i className="pdot" /> The HR operating system</span>
            <h1>Run your whole<br />HR stack from<br /><span className="accent">one calm place.</span></h1>
            <p className="hero-d-sub">Hiring, payroll, time-off and performance — for 1,200+ teams, in a single workspace.</p>
            <div className="hero-d-ctas">
              <Link href="/signup" className="btn btn-primary btn-lg">Start free trial <ArrowRight /></Link>
              <Link href="/demo" className="btn btn-outline btn-lg">Book a demo</Link>
            </div>
          </div>
          <div className="hero-d-visual">
            <PeopleCard />
          </div>
        </div>
      </section>

      {/* ============ HERO — MOBILE (dark, centered) ============ */}
      <section className="hero-m">
        <div className="container hero-m-inner">
          <span className="pill-dark-hero"><i className="pdot" /> Trusted by 1,200+ people teams</span>
          <h1>The calm operating system for <span className="accent">people teams.</span></h1>
          <p className="hero-m-sub">One workspace for everything HR — from the first offer letter to payday, beautifully connected.</p>
          <div className="hero-m-ctas">
            <Link href="/signup" className="btn btn-primary btn-lg">Start free trial <ArrowRight /></Link>
            <Link href="/demo" className="btn btn-watch btn-lg"><PlayIcon /> Watch demo</Link>
          </div>
        </div>
      </section>

      {/* ============ MODULE STRIP ============ */}
      <section className="strip-sec">
        <div className="container logo-strip">
          <div className="strip-label">One workspace for the whole employee lifecycle</div>
          <div className="strip-logos">
            {['People', 'Attendance', 'Leave', 'Payroll', 'Approvals', 'Schedules'].map((c) => (<span key={c}>{c}</span>))}
          </div>
        </div>
      </section>

      {/* ============ ONE PLATFORM ============ */}
      <section className="platform">
        <div className="container">
          <div className="section-head">
            <div className="kicker">One platform</div>
            <h2>Everything HR, in one calm place.</h2>
            <p className="section-sub">
              Stop stitching together five tools. NorthWeb Labs runs the whole employee lifecycle
              from a single, fast workspace.
            </p>
          </div>

          <div className="feature-grid">
            <Link href="/product/people" className="feature-card dark-card">
              <span className="icon-tile dark-tile" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </span>
              <span className="dark-card-glow" aria-hidden="true" />
              <div className="dark-card-body">
                <h3>A people directory your whole company loves</h3>
                <p>Profiles, roles and self-serve onboarding — with role-based access so everyone sees exactly what they should.</p>
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
              <li><span className="check-badge"><CheckIcon /></span><div><h4>Payslips in minutes</h4><p>Generate payslips and net pay, then approve &mdash; done.</p></div></li>
              <li><span className="check-badge"><CheckIcon /></span><div><h4>Approvals that don&rsquo;t pile up</h4><p>Leave and reimbursements routed to the right person instantly.</p></div></li>
              <li><span className="check-badge"><CheckIcon /></span><div><h4>Reports leadership trusts</h4><p>Expense, attendance and cost views you can filter by date range.</p></div></li>
            </ul>
            <Link href="/demo" className="btn btn-dark btn-lg">See it in action <ArrowRight /></Link>
          </div>
          <div className="speed-visual">
            <DashboardMock framed />
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
            <div key={s.label} className="stat"><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>
          ))}
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="cta-banner-wrap">
        <div className="container">
          <div className="cta-banner">
            <h2>Give your people team their time back.</h2>
            <p>Start free in minutes. No credit card, no setup headache &mdash; add your team and go.</p>
            <div className="cta-banner-actions">
              <Link href="/signup" className="btn btn-white btn-lg">Start free <ArrowRight /></Link>
              <Link href="/contact" className="btn btn-ghost btn-lg">Talk to sales</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ============ STYLES ============ */}
      <style dangerouslySetInnerHTML={{ __html: `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0b1220; background: #fff; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }
        ul { list-style: none; }
        .page { overflow-x: hidden; }
        html, body { overflow-x: hidden; }
        .container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        .kicker { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #2563eb; margin-bottom: 16px; }

        /* Buttons */
        .btn { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; border-radius: 12px; padding: 13px 24px; cursor: pointer; border: none; transition: transform .15s ease, box-shadow .15s ease, background .15s ease; white-space: nowrap; }
        .btn:hover { transform: translateY(-1px); }
        .btn-sm { padding: 10px 18px; font-size: 14px; }
        .btn-lg { padding: 15px 28px; }
        .btn-primary { background: #2563eb; color: #fff; box-shadow: 0 8px 20px rgba(37,99,235,0.28); }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-dark { background: #0b1220; color: #fff; }
        .btn-dark:hover { background: #1a2436; }
        .btn-outline { background: #fff; color: #0b1220; border: 1px solid #dbe1ea; }
        .btn-outline:hover { border-color: #b9c3d4; }
        .btn-white { background: #fff; color: #0b1220; }
        .btn-ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.45); }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }
        .btn-watch { background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.18); }
        .btn-watch:hover { background: rgba(255,255,255,0.12); }

        /* Header */
        .site-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid #eef1f6; }
        .header-inner { display: flex; align-items: center; gap: 36px; height: 76px; }
        .logo { display: inline-flex; align-items: center; gap: 10px; }
        .logo-mark-img { width: 36px; height: 36px; border-radius: 10px; object-fit: contain; display: block; }
        .logo-text { font-weight: 800; font-size: 18px; color: #0b1220; }
        .logo-accent { color: #2563eb; }
        .main-nav { display: flex; gap: 28px; }
        .nav-link { font-size: 15px; font-weight: 500; color: #3b4456; transition: color .15s; }
        .nav-link:hover { color: #0b1220; }
        .header-actions { margin-left: auto; display: flex; align-items: center; gap: 20px; }
        .signin { font-weight: 600; color: #0b1220; }

        /* HERO — desktop (light split) */
        .hero-d { position: relative; overflow: hidden; background: linear-gradient(180deg, #fff 0%, #f4f7fb 100%); padding: 70px 0 96px; }
        .hero-d-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 40px; align-items: center; }
        .hero-d-grid > * { min-width: 0; }
        .pill-light { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #dbe3ef; border-radius: 999px; padding: 8px 16px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #5b6577; }
        .pdot { width: 7px; height: 7px; border-radius: 50%; background: #2563eb; display: inline-block; }
        .hero-d-copy h1 { font-size: clamp(40px, 5vw, 64px); line-height: 1.03; letter-spacing: -0.03em; font-weight: 800; margin-top: 28px; }
        .accent { color: #2563eb; }
        .hero-d-sub { margin-top: 24px; font-size: 18px; line-height: 1.6; color: #4a5468; max-width: 440px; }
        .hero-d-ctas { display: flex; gap: 14px; margin-top: 34px; }
        .hero-d-visual { position: relative; }
        .people-card { width: 640px; max-width: none; background: #fff; border-radius: 22px; padding: 26px; box-shadow: 0 34px 80px rgba(15,30,60,0.18); transform: rotate(-4deg); position: relative; left: 28px; }
        .pm-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .pm-title { font-size: 20px; font-weight: 800; color: #0b1220; }
        .pm-period { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; letter-spacing: 0.14em; color: #9aa3b5; }
        .pm-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .pm-stat { border: 1px solid #eef1f6; border-radius: 14px; padding: 16px; }
        .pm-stat-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #9aa3b5; }
        .pm-stat-num { font-size: 34px; font-weight: 800; color: #0b1220; line-height: 1.1; margin-top: 6px; }
        .pm-stat-sub { font-size: 13px; color: #67718a; margin-top: 6px; }
        .pm-stat-sub b { color: #16a34a; font-weight: 700; }
        .pm-chart { display: flex; align-items: flex-end; gap: 12px; height: 150px; margin-top: 22px; }
        .pm-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; height: 100%; }
        .pm-bar { width: 100%; border-radius: 10px 10px 5px 5px; background: #eef1fb; }
        .pm-bar.tall { background: linear-gradient(180deg, #3b6ef5, #2563eb); box-shadow: 0 8px 18px rgba(37,99,235,0.3); }
        .pm-col-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10px; letter-spacing: 0.08em; color: #9aa3b5; }

        /* HERO — mobile (dark centered), hidden on desktop */
        .hero-m { display: none; position: relative; overflow: hidden; padding: 120px 0 90px; background: radial-gradient(120% 120% at 50% -10%, #17284f 0%, #0b1424 58%); }
        .hero-m::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 24px 24px; }
        .hero-m-inner { position: relative; text-align: center; }
        .pill-dark-hero { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; padding: 8px 16px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #aeb9d4; }
        .hero-m h1 { color: #fff; font-size: clamp(38px, 11vw, 60px); line-height: 1.05; letter-spacing: -0.02em; font-weight: 800; margin-top: 26px; }
        .hero-m h1 .accent { color: #5b85f7; }
        .hero-m-sub { color: #aab3c5; font-size: 17px; line-height: 1.6; margin: 22px auto 0; max-width: 520px; }
        .hero-m-ctas { display: flex; gap: 14px; justify-content: center; margin-top: 34px; flex-wrap: wrap; }

        /* Module strip */
        .strip-sec { background: #fff; padding: 64px 0 8px; }
        .logo-strip { text-align: center; }
        .strip-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a93a6; margin-bottom: 28px; }
        .strip-logos { display: flex; justify-content: center; flex-wrap: wrap; gap: 18px 56px; font-size: 22px; font-weight: 800; color: #b6bfce; }

        /* Centered section head */
        .section-head { text-align: center; max-width: 720px; margin: 0 auto; }
        .section-head .section-sub { margin-left: auto; margin-right: auto; }

        /* Platform */
        .platform { padding: 96px 0 100px; }
        .platform h2, .speed h2 { font-size: clamp(34px, 4vw, 46px); font-weight: 800; letter-spacing: -0.025em; }
        .section-sub { margin-top: 16px; font-size: 17.5px; line-height: 1.65; color: #4a5468; max-width: 560px; }
        .feature-grid { margin-top: 56px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .feature-card { display: block; border-radius: 20px; transition: transform .18s ease, box-shadow .18s ease; }
        .feature-card:hover { transform: translateY(-3px); }
        .light-card { background: #fff; border: 1px solid #e7ecf3; padding: 32px; box-shadow: 0 4px 14px rgba(15,30,60,0.04); }
        .light-card:hover { box-shadow: 0 16px 36px rgba(15,30,60,0.1); }
        .light-card h3 { font-size: 21px; font-weight: 800; margin: 22px 0 10px; }
        .light-card p { font-size: 15.5px; line-height: 1.6; color: #4a5468; }
        .icon-tile { width: 52px; height: 52px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; }
        .blue-tile { background: #e3ecfd; } .green-tile { background: #dcf5e6; } .amber-tile { background: #fdeed3; } .indigo-tile { background: #e4e4fb; } .dark-tile { background: rgba(255,255,255,0.12); }
        .dark-card { grid-row: span 2; position: relative; overflow: hidden; background: radial-gradient(120% 120% at 85% 8%, #1a2c52 0%, #0b1220 55%); padding: 32px; display: flex; flex-direction: column; box-shadow: 0 18px 44px rgba(8,16,34,0.35); }
        .dark-card-glow { position: absolute; top: -70px; right: -40px; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(59,110,245,0.5), transparent 65%); filter: blur(8px); pointer-events: none; }
        .dark-card-body { margin-top: auto; position: relative; }
        .dark-card h3 { color: #fff; font-size: 27px; font-weight: 800; line-height: 1.25; max-width: 420px; }
        .dark-card p { color: #b9c3d8; font-size: 15.5px; line-height: 1.65; margin-top: 14px; max-width: 440px; }
        .text-link { display: inline-flex; align-items: center; gap: 7px; margin-top: 22px; color: #7ea4f7; font-weight: 700; font-size: 15.5px; }

        /* Speed */
        .speed { background: #f4f7fb; padding: 100px 0; }
        .speed-grid { display: grid; grid-template-columns: 1fr 1.05fr; gap: 64px; align-items: center; }
        .speed-grid > * { min-width: 0; }
        .speed-list { margin: 38px 0 40px; display: flex; flex-direction: column; gap: 28px; }
        .speed-list li { display: flex; gap: 16px; }
        .check-badge { width: 30px; height: 30px; border-radius: 9px; background: #22c55e; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .speed-list h4 { font-size: 17.5px; font-weight: 800; margin-bottom: 5px; }
        .speed-list p { font-size: 15.5px; line-height: 1.6; color: #4a5468; }

        /* Old dashboard mock */
        .dash-wrap { position: relative; }
        .dash-wrap.framed { background: linear-gradient(135deg, #dde7fb 0%, #eef2fc 60%, #f6f8fe 100%); border-radius: 28px; padding: 44px 40px 56px 56px; }
        .dash { position: relative; background: #fff; border-radius: 16px; border: 1px solid #e7ecf3; box-shadow: 0 24px 60px rgba(15,30,60,0.12); max-width: 100%; }
        .dash-titlebar { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #eef1f6; }
        .dash-logo { width: 24px; height: 24px; border-radius: 7px; object-fit: contain; display: block; }
        .dash-title { font-size: 14px; font-weight: 700; }
        .dash-dots { margin-left: auto; display: flex; gap: 6px; }
        .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
        .dot.red { background: #ef4444; } .dot.yellow { background: #f59e0b; } .dot.green { background: #22c55e; }
        .dash-body { display: flex; }
        .dash-rail { width: 58px; border-right: 1px solid #eef1f6; padding: 18px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .rail-item { width: 22px; height: 22px; border-radius: 7px; background: #e8edf5; }
        .rail-item.active { background: #2563eb; }
        .dash-main { flex: 1; padding: 18px 20px 22px; }
        .dash-greeting { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
        .dash-pay-card { display: flex; align-items: flex-end; justify-content: space-between; border: 1px solid #e7ecf3; border-radius: 12px; padding: 14px 16px; box-shadow: 0 6px 18px rgba(15,30,60,0.05); margin-bottom: 14px; }
        .pay-label { font-size: 12.5px; color: #67718a; margin-bottom: 5px; }
        .pay-amount { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 26px; font-weight: 700; }
        .mini-bars { display: flex; align-items: flex-end; gap: 4px; }
        .mini-bars .bar { width: 6px; border-radius: 3px; background: #bcd2fb; display: inline-block; }
        .mini-bars .bar.tall { background: #2563eb; }
        .dash-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dash-small-card { border: 1px solid #e7ecf3; border-radius: 12px; padding: 12px 14px; box-shadow: 0 6px 18px rgba(15,30,60,0.04); }
        .small-num { font-size: 18px; font-weight: 800; }
        .small-num span { font-size: 12px; color: #67718a; font-weight: 500; }
        .pips { display: flex; gap: 5px; margin-top: 10px; }
        .pip { width: 26px; height: 5px; border-radius: 3px; background: #e3e9f2; }
        .pip.on { background: #2563eb; }
        .small-label { font-size: 12.5px; color: #67718a; margin-bottom: 6px; }
        .checked-in { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
        .time-range { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #67718a; margin-top: 5px; }
        .chip { position: absolute; background: #fff; border-radius: 14px; box-shadow: 0 14px 34px rgba(15,30,60,0.16); font-size: 13.5px; display: flex; align-items: center; gap: 9px; padding: 11px 16px; }
        .chip-payroll { top: 28px; right: -22px; font-weight: 600; }
        .chip-dot { width: 9px; height: 9px; border-radius: 50%; background: #2563eb; }
        .chip-leave { bottom: 86px; left: -34px; padding: 12px 18px 12px 12px; }
        .chip-check { width: 34px; height: 34px; border-radius: 10px; background: #22c55e; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .chip-leave strong { display: block; font-size: 14px; }
        .chip-leave em { display: block; font-style: normal; font-size: 12.5px; color: #67718a; }

        /* Stats band */
        .stats { background: #0b1220; background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 26px 26px; padding: 84px 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; text-align: center; }
        .stat-num { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: clamp(34px, 4vw, 48px); font-weight: 700; color: #fff; }
        .stat-label { margin-top: 10px; font-size: 15px; color: #94a0b8; }

        /* CTA */
        .cta-banner-wrap { padding: 100px 0; background: #fff; }
        .cta-banner { position: relative; overflow: hidden; text-align: center; background: linear-gradient(120deg, #2057e0 0%, #3b6ef5 60%, #5b85f7 100%); border-radius: 28px; padding: 86px 32px; box-shadow: 0 28px 60px rgba(37,99,235,0.35); }
        .cta-banner h2 { color: #fff; font-size: clamp(32px, 4vw, 46px); font-weight: 800; letter-spacing: -0.02em; }
        .cta-banner p { color: rgba(255,255,255,0.88); font-size: 17.5px; line-height: 1.6; margin: 18px auto 36px; max-width: 520px; }
        .cta-banner-actions { display: flex; justify-content: center; gap: 14px; }

        /* Footer (component) */
        .footer { background: #0b1220; color: #aab3c5; padding: 78px 0 36px; }
        .footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 40px; }
        .footer-brand p { margin-top: 20px; font-size: 15px; line-height: 1.7; }
        .footer-col { display: flex; flex-direction: column; gap: 13px; }
        .footer-col h5 { color: #fff; font-size: 14.5px; font-weight: 700; margin-bottom: 6px; }
        .footer-col a { font-size: 14.5px; color: #aab3c5; transition: color .15s; }
        .footer-col a:hover { color: #fff; }
        .footer-bottom { margin-top: 64px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
        .footer-copy { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #7e8aa0; }
        .footer-legal { display: flex; gap: 24px; }
        .footer-legal a { font-size: 13.5px; color: #aab3c5; }
        .footer-legal a:hover { color: #fff; }

        /* ---------- Responsive: swap heroes at 900px ---------- */
        @media (max-width: 980px) { .main-nav { display: none; } .feature-grid { grid-template-columns: 1fr; } .dark-card { grid-row: auto; min-height: 360px; } .stats-grid { grid-template-columns: repeat(2,1fr); gap: 44px 24px; } .footer-grid { grid-template-columns: 1fr 1fr; } .speed-grid { grid-template-columns: 1fr; gap: 40px; } .platform { padding: 72px 0; } .speed { padding: 72px 0; } .cta-banner-wrap { padding: 72px 0; } .dash-wrap.framed { padding: 28px 22px 38px; } .chip-payroll { right: 12px; top: 12px; } .chip-leave { left: 12px; bottom: 12px; } }

        @media (max-width: 900px) {
          .hero-d { display: none; }
          .hero-m { display: block; }
          /* header sits over the dark hero */
          .site-header { position: absolute; top: 0; left: 0; right: 0; background: transparent; backdrop-filter: none; border-bottom: none; }
          .logo-text { color: #fff; }
          .signin { display: none; }
        }

        @media (max-width: 560px) {
          .container { padding: 0 18px; }
          .header-inner { gap: 16px; height: 64px; }
          .hero-m { padding: 104px 0 72px; }
          .hero-m-ctas { flex-direction: column; align-items: stretch; }
          .cta-banner-actions { flex-direction: column; align-items: stretch; }
          .strip-logos { gap: 14px 28px; font-size: 17px; }
          .light-card, .dark-card { padding: 26px 22px 28px; }
          .cta-banner { padding: 52px 22px; border-radius: 22px; }
          .dash-wrap.framed { padding: 16px 12px 24px; }
          .dash-rail { width: 44px; }
          .dash-main { padding: 14px 13px 16px; }
          .pay-amount { font-size: 21px; }
          .chip { font-size: 12px; padding: 8px 12px; }
        }
        @media (max-width: 380px) { .dash-row { grid-template-columns: 1fr; } .mini-bars { display: none; } }
      ` }} />
    </div>
  );
}