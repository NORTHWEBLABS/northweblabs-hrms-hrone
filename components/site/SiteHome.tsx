import Link from "next/link";
import React from "react";

/* ============================================================
   Data-driven marketing homepage renderer.
   Renders header + an ordered list of section blocks from data.
   Phase 1: viewable at /site-preview, seeded with current content.
   ============================================================ */

export type Theme = {
  brand: string; ink: string; bg: string; font: string;
  logoUrl?: string; logoText?: string; logoAccent?: string;
};

export type CTA = { label: string; href: string; style?: "primary" | "outline" | "dark" | "white" | "ghost" | "watch"; arrow?: boolean; play?: boolean };
export type Block = { id: string; type: string; enabled: boolean; data: any };
export type Header = { nav: { label: string; href: string }[]; signinLabel: string; ctaLabel: string; ctaHref: string };

/* ---------- icons ---------- */
const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
);
const CheckIcon = ({ color = "#fff" }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const PlayIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>);
const ICONS: Record<string, React.ReactNode> = {
  people: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
  calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  wallet: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  approvals: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H5.2L4 17.2V4z" /><path d="m9 9 2 2 4-4" /></svg>,
};

const btnClass = (s?: CTA["style"]) =>
  s === "outline" ? "btn btn-outline btn-lg" : s === "dark" ? "btn btn-dark btn-lg" :
  s === "white" ? "btn btn-white btn-lg" : s === "ghost" ? "btn btn-ghost btn-lg" :
  s === "watch" ? "btn btn-watch btn-lg" : "btn btn-primary btn-lg";

const Cta = ({ c }: { c: CTA }) => (
  <Link href={c.href} className={btnClass(c.style)}>{c.play && <PlayIcon />}{c.label}{c.arrow && <ArrowRight />}</Link>
);

const Headline = ({ headline, accent, accentBlock }: { headline: string; accent?: string; accentBlock?: boolean }) => {
  const lines = (headline || "").split("\n");
  return (
    <>
      {lines.map((l, i) => (<React.Fragment key={i}>{l}{i < lines.length - 1 ? <br /> : null}</React.Fragment>))}
      {accent ? (<>{accentBlock ? <br /> : " "}<span className="accent">{accent}</span></>) : null}
    </>
  );
};

/* ---------- section renderers ---------- */
function HeroBlock({ d }: { d: any }) {
  return (
    <>
      <section className="hero-d">
        <div className="container hero-d-grid">
          <div className="hero-d-copy">
            <span className="pill-light"><i className="pdot" /> {d.desktop.pill}</span>
            <h1><Headline headline={d.desktop.headline} accent={d.desktop.accent} accentBlock /></h1>
            <p className="hero-d-sub">{d.desktop.sub}</p>
            <div className="hero-d-ctas">{(d.desktop.ctas || []).map((c: CTA, i: number) => <Cta key={i} c={c} />)}</div>
          </div>
          <div className="hero-d-visual">
            <div className="people-card">
              <div className="pm-head"><span className="pm-title">{d.people.title}</span><span className="pm-period">{d.people.period}</span></div>
              <div className="pm-stats">
                {(d.people.stats || []).map((s: any, i: number) => (
                  <div className="pm-stat" key={i}>
                    <div className="pm-stat-label">{s.label}</div>
                    <div className="pm-stat-num">{s.num}</div>
                    <div className="pm-stat-sub">{s.up ? <b>{s.sub}</b> : s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="pm-chart" aria-hidden="true">
                {(d.people.chart || []).map((b: any, i: number, arr: any[]) => (
                  <div className="pm-col" key={i}><span className={i === arr.length - 1 ? "pm-bar tall" : "pm-bar"} style={{ height: b.h }} /><span className="pm-col-label">{b.m}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="hero-m">
        <div className="container hero-m-inner">
          <span className="pill-dark-hero"><i className="pdot" /> {d.mobile.pill}</span>
          <h1><Headline headline={d.mobile.headline} accent={d.mobile.accent} /></h1>
          <p className="hero-m-sub">{d.mobile.sub}</p>
          <div className="hero-m-ctas">{(d.mobile.ctas || []).map((c: CTA, i: number) => <Cta key={i} c={c} />)}</div>
        </div>
      </section>
    </>
  );
}

function ModuleStrip({ d }: { d: any }) {
  return (
    <section className="strip-sec"><div className="container logo-strip">
      <div className="strip-label">{d.label}</div>
      <div className="strip-logos">{(d.items || []).map((c: string) => <span key={c}>{c}</span>)}</div>
    </div></section>
  );
}

function Platform({ d }: { d: any }) {
  return (
    <section className="platform"><div className="container">
      <div className="section-head"><div className="kicker">{d.kicker}</div><h2>{d.heading}</h2><p className="section-sub">{d.sub}</p></div>
      <div className="feature-grid">
        {(d.cards || []).map((c: any, i: number) => c.variant === "dark" ? (
          <Link href={c.href || "#"} key={i} className="feature-card dark-card">
            <span className="icon-tile dark-tile" aria-hidden="true">{ICONS[c.icon] || ICONS.people}</span>
            <span className="dark-card-glow" aria-hidden="true" />
            <div className="dark-card-body"><h3>{c.title}</h3><p>{c.text}</p>{c.link && <span className="text-link">{c.link.label} <ArrowRight size={15} /></span>}</div>
          </Link>
        ) : (
          <Link href={c.href || "#"} key={i} className="feature-card light-card">
            <span className={`icon-tile ${c.tile || "blue-tile"}`} aria-hidden="true">{ICONS[c.icon] || ICONS.clock}</span>
            <h3>{c.title}</h3><p>{c.text}</p>
          </Link>
        ))}
      </div>
    </div></section>
  );
}

function Speed({ d }: { d: any }) {
  const m = d.mock || {};
  return (
    <section className="speed"><div className="container speed-grid">
      <div className="speed-copy">
        <div className="kicker">{d.kicker}</div>
        <h2><Headline headline={d.heading} /></h2>
        <ul className="speed-list">
          {(d.items || []).map((it: any, i: number) => (<li key={i}><span className="check-badge"><CheckIcon /></span><div><h4>{it.title}</h4><p>{it.text}</p></div></li>))}
        </ul>
        {d.cta && <Cta c={d.cta} />}
      </div>
      <div className="speed-visual">
        <div className="dash-wrap framed"><div className="dash">
          <div className="dash-titlebar"><span className="dash-title">{m.appTitle || "Dashboard"}</span><span className="dash-dots"><i className="dot red" /><i className="dot yellow" /><i className="dot green" /></span></div>
          <div className="dash-body">
            <div className="dash-rail"><span className="rail-item active" /><span className="rail-item" /><span className="rail-item" /><span className="rail-item" /></div>
            <div className="dash-main">
              <div className="dash-greeting">{m.greeting}</div>
              <div className="dash-pay-card">
                <div><div className="pay-label">{m.payLabel}</div><div className="pay-amount">{m.payAmount}</div></div>
                <div className="mini-bars" aria-hidden="true">{(m.bars || []).map((h: number, i: number, arr: number[]) => (<span key={i} style={{ height: h }} className={i === arr.length - 1 ? "bar tall" : "bar"} />))}</div>
              </div>
              <div className="dash-row">
                <div className="dash-small-card"><div className="small-num">{m.daysNum} <span>days</span></div><div className="pips" aria-hidden="true">{(m.pips || []).map((on: number, i: number) => (<span key={i} className={on ? "pip on" : "pip"} />))}</div></div>
                <div className="dash-small-card"><div className="small-label">{m.todayLabel || "Today"}</div><div className="checked-in"><i className="status-dot" /> {m.statusText}</div><div className="time-range">{m.timeRange}</div></div>
              </div>
            </div>
          </div>
          <div className="chip chip-payroll"><i className="chip-dot" /> {m.chip1 || "Payslip · ready"}</div>
          <div className="chip chip-leave"><span className="chip-check"><CheckIcon /></span><span><strong>{m.chip2Title || "Leave approved"}</strong><em>{m.chip2Sub || "2 days · Aug"}</em></span></div>
        </div></div>
      </div>
    </div></section>
  );
}

function Stats({ d }: { d: any }) {
  return (
    <section className="stats" aria-label="What's inside"><div className="container stats-grid">
      {(d.items || []).map((s: any, i: number) => (<div key={i} className="stat"><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>))}
    </div></section>
  );
}

function CtaBanner({ d }: { d: any }) {
  return (
    <section className="cta-banner-wrap"><div className="container"><div className="cta-banner">
      <h2>{d.heading}</h2><p>{d.text}</p>
      <div className="cta-banner-actions">{(d.ctas || []).map((c: CTA, i: number) => <Cta key={i} c={c} />)}</div>
    </div></div></section>
  );
}

const RENDERERS: Record<string, (p: { d: any }) => React.ReactNode> = {
  hero: HeroBlock, moduleStrip: ModuleStrip, platform: Platform, speed: Speed, stats: Stats, ctaBanner: CtaBanner,
};

const FONT_STACKS: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  inter: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  geist: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export default function SiteHome({ theme, header, sections }: { theme: Theme; header: Header; sections: Block[] }) {
  const t = theme;
  const themeCss = `
    :root { --brand:${t.brand}; --ink:${t.ink}; --bg:${t.bg}; }
    body { font-family:${FONT_STACKS[t.font] || FONT_STACKS.system}; }
    .accent, .logo-accent, .hero-m h1 .accent { color: var(--brand); }
    .btn-primary { background: var(--brand); box-shadow: 0 8px 20px color-mix(in srgb, var(--brand) 28%, transparent); }
    .btn-primary:hover { filter: brightness(0.93); }
    .kicker, .text-link { color: var(--brand); }
    .pdot, .chip-dot, .rail-item.active, .mini-bars .bar.tall, .pip.on, .pm-bar.tall, .nav-link.active { background: var(--brand); }
  `;
  return (
    <div className="page">
      <header className="site-header"><div className="container header-inner">
        <Link href="/" className="logo" aria-label="home">
          {t.logoUrl ? <img src={t.logoUrl} alt="" className="logo-mark-img" aria-hidden="true" /> : <img src="/logo-nwl.png" alt="" className="logo-mark-img" aria-hidden="true" />}
          <span className="logo-text">{t.logoText || "NorthWeb"} <span className="logo-accent">{t.logoAccent || "Labs"}</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main">{(header.nav || []).map((n) => (<Link key={n.href} href={n.href} className="nav-link">{n.label}</Link>))}</nav>
        <div className="header-actions"><Link href="/login" className="nav-link signin">{header.signinLabel}</Link><Link href={header.ctaHref} className="btn btn-primary btn-sm">{header.ctaLabel}</Link></div>
      </div></header>

      {sections.filter(s => s.enabled).map((s) => {
        const R = RENDERERS[s.type];
        return R ? <React.Fragment key={s.id}>{R({ d: s.data })}</React.Fragment> : null;
      })}

      <style dangerouslySetInnerHTML={{ __html: themeCss + BASE_CSS }} />
    </div>
  );
}

const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { color: #0b1220; background: #fff; -webkit-font-smoothing: antialiased; }
a { text-decoration: none; color: inherit; }
ul { list-style: none; }
.page { overflow-x: hidden; }
.container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
.kicker { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; margin-bottom: 16px; }
.btn { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; border-radius: 12px; padding: 13px 24px; cursor: pointer; border: none; transition: transform .15s ease, box-shadow .15s ease, background .15s ease; white-space: nowrap; }
.btn:hover { transform: translateY(-1px); }
.btn-sm { padding: 10px 18px; font-size: 14px; }
.btn-lg { padding: 15px 28px; }
.btn-primary { color: #fff; }
.btn-dark { background: #0b1220; color: #fff; }
.btn-dark:hover { background: #1a2436; }
.btn-outline { background: #fff; color: #0b1220; border: 1px solid #dbe1ea; }
.btn-outline:hover { border-color: #b9c3d4; }
.btn-white { background: #fff; color: #0b1220; }
.btn-ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.45); }
.btn-ghost:hover { background: rgba(255,255,255,0.1); }
.btn-watch { background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.18); }
.btn-watch:hover { background: rgba(255,255,255,0.12); }
.site-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid #eef1f6; }
.header-inner { display: flex; align-items: center; gap: 36px; height: 76px; }
.logo { display: inline-flex; align-items: center; gap: 10px; }
.logo-mark-img { width: 36px; height: 36px; border-radius: 10px; object-fit: contain; display: block; }
.logo-text { font-weight: 800; font-size: 18px; color: #0b1220; }
.main-nav { display: flex; gap: 28px; }
.nav-link { font-size: 15px; font-weight: 500; color: #3b4456; transition: color .15s; }
.nav-link:hover { color: #0b1220; }
.header-actions { margin-left: auto; display: flex; align-items: center; gap: 20px; }
.signin { font-weight: 600; color: #0b1220; }
.hero-d { position: relative; overflow: hidden; background: linear-gradient(180deg, #fff 0%, #f4f7fb 100%); padding: 70px 0 96px; }
.hero-d-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 40px; align-items: center; }
.hero-d-grid > * { min-width: 0; }
.pill-light { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #dbe3ef; border-radius: 999px; padding: 8px 16px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #5b6577; }
.pdot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.hero-d-copy h1 { font-size: clamp(40px, 5vw, 64px); line-height: 1.03; letter-spacing: -0.03em; font-weight: 800; margin-top: 28px; }
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
.pm-bar.tall { box-shadow: 0 8px 18px rgba(37,99,235,0.3); }
.pm-col-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10px; letter-spacing: 0.08em; color: #9aa3b5; }
.hero-m { display: none; position: relative; overflow: hidden; padding: 120px 0 90px; background: radial-gradient(120% 120% at 50% -10%, #17284f 0%, #0b1424 58%); }
.hero-m::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 24px 24px; }
.hero-m-inner { position: relative; text-align: center; }
.pill-dark-hero { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; padding: 8px 16px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #aeb9d4; }
.hero-m h1 { color: #fff; font-size: clamp(38px, 11vw, 60px); line-height: 1.05; letter-spacing: -0.02em; font-weight: 800; margin-top: 26px; }
.hero-m-sub { color: #aab3c5; font-size: 17px; line-height: 1.6; margin: 22px auto 0; max-width: 520px; }
.hero-m-ctas { display: flex; gap: 14px; justify-content: center; margin-top: 34px; flex-wrap: wrap; }
.strip-sec { background: #fff; padding: 64px 0 8px; }
.logo-strip { text-align: center; }
.strip-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a93a6; margin-bottom: 28px; }
.strip-logos { display: flex; justify-content: center; flex-wrap: wrap; gap: 18px 56px; font-size: 22px; font-weight: 800; color: #b6bfce; }
.section-head { text-align: center; max-width: 720px; margin: 0 auto; }
.section-head .section-sub { margin-left: auto; margin-right: auto; }
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
.text-link { display: inline-flex; align-items: center; gap: 7px; margin-top: 22px; font-weight: 700; font-size: 15.5px; }
.speed { background: #f4f7fb; padding: 100px 0; }
.speed-grid { display: grid; grid-template-columns: 1fr 1.05fr; gap: 64px; align-items: center; }
.speed-grid > * { min-width: 0; }
.speed-list { margin: 38px 0 40px; display: flex; flex-direction: column; gap: 28px; }
.speed-list li { display: flex; gap: 16px; }
.check-badge { width: 30px; height: 30px; border-radius: 9px; background: #22c55e; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
.speed-list h4 { font-size: 17.5px; font-weight: 800; margin-bottom: 5px; }
.speed-list p { font-size: 15.5px; line-height: 1.6; color: #4a5468; }
.dash-wrap { position: relative; }
.dash-wrap.framed { background: linear-gradient(135deg, #dde7fb 0%, #eef2fc 60%, #f6f8fe 100%); border-radius: 28px; padding: 44px 40px 56px 56px; }
.dash { position: relative; background: #fff; border-radius: 16px; border: 1px solid #e7ecf3; box-shadow: 0 24px 60px rgba(15,30,60,0.12); max-width: 100%; }
.dash-titlebar { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #eef1f6; }
.dash-title { font-size: 14px; font-weight: 700; }
.dash-dots { margin-left: auto; display: flex; gap: 6px; }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dot.red { background: #ef4444; } .dot.yellow { background: #f59e0b; } .dot.green { background: #22c55e; }
.dash-body { display: flex; }
.dash-rail { width: 58px; border-right: 1px solid #eef1f6; padding: 18px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.rail-item { width: 22px; height: 22px; border-radius: 7px; background: #e8edf5; }
.dash-main { flex: 1; padding: 18px 20px 22px; }
.dash-greeting { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
.dash-pay-card { display: flex; align-items: flex-end; justify-content: space-between; border: 1px solid #e7ecf3; border-radius: 12px; padding: 14px 16px; box-shadow: 0 6px 18px rgba(15,30,60,0.05); margin-bottom: 14px; }
.pay-label { font-size: 12.5px; color: #67718a; margin-bottom: 5px; }
.pay-amount { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 26px; font-weight: 700; }
.mini-bars { display: flex; align-items: flex-end; gap: 4px; }
.mini-bars .bar { width: 6px; border-radius: 3px; background: #bcd2fb; display: inline-block; }
.dash-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.dash-small-card { border: 1px solid #e7ecf3; border-radius: 12px; padding: 12px 14px; box-shadow: 0 6px 18px rgba(15,30,60,0.04); }
.small-num { font-size: 18px; font-weight: 800; }
.small-num span { font-size: 12px; color: #67718a; font-weight: 500; }
.pips { display: flex; gap: 5px; margin-top: 10px; }
.pip { width: 26px; height: 5px; border-radius: 3px; background: #e3e9f2; }
.small-label { font-size: 12.5px; color: #67718a; margin-bottom: 6px; }
.checked-in { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
.time-range { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px; color: #67718a; margin-top: 5px; }
.chip { position: absolute; background: #fff; border-radius: 14px; box-shadow: 0 14px 34px rgba(15,30,60,0.16); font-size: 13.5px; display: flex; align-items: center; gap: 9px; padding: 11px 16px; }
.chip-payroll { top: 28px; right: -22px; font-weight: 600; }
.chip-dot { width: 9px; height: 9px; border-radius: 50%; }
.chip-leave { bottom: 86px; left: -34px; padding: 12px 18px 12px 12px; }
.chip-check { width: 34px; height: 34px; border-radius: 10px; background: #22c55e; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.chip-leave strong { display: block; font-size: 14px; }
.chip-leave em { display: block; font-style: normal; font-size: 12.5px; color: #67718a; }
.stats { background: #0b1220; background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 26px 26px; padding: 84px 0; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; text-align: center; }
.stat-num { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: clamp(34px, 4vw, 48px); font-weight: 700; color: #fff; }
.stat-label { margin-top: 10px; font-size: 15px; color: #94a0b8; }
.cta-banner-wrap { padding: 100px 0; background: #fff; }
.cta-banner { position: relative; overflow: hidden; text-align: center; background: linear-gradient(120deg, #2057e0 0%, #3b6ef5 60%, #5b85f7 100%); border-radius: 28px; padding: 86px 32px; box-shadow: 0 28px 60px rgba(37,99,235,0.35); }
.cta-banner h2 { color: #fff; font-size: clamp(32px, 4vw, 46px); font-weight: 800; letter-spacing: -0.02em; }
.cta-banner p { color: rgba(255,255,255,0.88); font-size: 17.5px; line-height: 1.6; margin: 18px auto 36px; max-width: 520px; }
.cta-banner-actions { display: flex; justify-content: center; gap: 14px; }
@media (max-width: 980px) { .main-nav { display: none; } .feature-grid { grid-template-columns: 1fr; } .dark-card { grid-row: auto; min-height: 360px; } .stats-grid { grid-template-columns: repeat(2,1fr); gap: 44px 24px; } .speed-grid { grid-template-columns: 1fr; gap: 40px; } .platform { padding: 72px 0; } .speed { padding: 72px 0; } .cta-banner-wrap { padding: 72px 0; } .dash-wrap.framed { padding: 28px 22px 38px; } .chip-payroll { right: 12px; top: 12px; } .chip-leave { left: 12px; bottom: 12px; } }
@media (max-width: 900px) { .hero-d { display: none; } .hero-m { display: block; } .site-header { position: absolute; top: 0; left: 0; right: 0; background: transparent; backdrop-filter: none; border-bottom: none; } .logo-text { color: #fff; } .signin { display: none; } }
@media (max-width: 560px) { .container { padding: 0 18px; } .header-inner { gap: 16px; height: 64px; } .hero-m { padding: 104px 0 72px; } .hero-m-ctas { flex-direction: column; align-items: stretch; } .cta-banner-actions { flex-direction: column; align-items: stretch; } .strip-logos { gap: 14px 28px; font-size: 17px; } .light-card, .dark-card { padding: 26px 22px 28px; } .cta-banner { padding: 52px 22px; border-radius: 22px; } .dash-wrap.framed { padding: 16px 12px 24px; } .dash-rail { width: 44px; } .dash-main { padding: 14px 13px 16px; } .pay-amount { font-size: 21px; } .chip { font-size: 12px; padding: 8px 12px; } }
@media (max-width: 380px) { .dash-row { grid-template-columns: 1fr; } .mini-bars { display: none; } }
`;
