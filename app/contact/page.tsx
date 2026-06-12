"use client";
// Route: app/contact/page.tsx
// NorthWeb Labs — Contact page (ink left panel + white form).
// Contact details show Email only (phone + office removed).
// Form is front-end only for now: validates and shows a success state.

import { useState, useId } from "react";

/* ── Brand tokens ── */
const NWL = {
  ink: "#0A1628", blue: "#1E5BFF", blue2: "#4A7BFF",
  tint: "#DCE5FF", mint: "#23C58A", steel: "#334063",
  muted: "#5B6478", line2: "#E4E7F0",
};

const ct = {
  primary: NWL.blue, onPrimary: "#fff",
  btnShadow: "0 10px 24px rgba(30,91,255,.32)",
  text: NWL.ink, label: NWL.ink, muted: NWL.muted, icon: "#8893A8",
  fieldBg: "#fff", fieldBorder: NWL.line2,
};

/* ── Geometric N mark ── */
function NMark({ size = 36, tile = NWL.ink, accent, rx = 10 }: {
  size?: number; tile?: string; accent?: string; rx?: number;
}) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ display: "block" }}>
      <defs><mask id={id}><rect width="80" height="80" fill="#fff" />
        <rect x="20" y="16" width="10" height="48" fill="#000" />
        <rect x="50" y="16" width="10" height="48" fill="#000" />
        <path d="M20 16 L30 16 L60 64 L50 64 Z" fill="#000" />
      </mask></defs>
      <rect width="80" height="80" rx={rx * (80 / size)} fill={tile} mask={`url(#${id})`} />
      {accent && <path d="M20 16 L30 16 L60 64 L50 64 Z" fill={accent} />}
    </svg>
  );
}

/* ── Wordmark ── */
function Wordmark({ color = NWL.ink, sub = NWL.muted, size = 17 }: {
  color?: string; sub?: string; size?: number;
}) {
  return (
    <div>
      <div style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: size,
        letterSpacing: "-0.02em", color, lineHeight: 1, whiteSpace: "nowrap" }}>
        NorthWeb<span style={{ color: NWL.blue }}> Labs</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: size * 0.46,
        letterSpacing: "0.22em", color: sub, marginTop: 5, textTransform: "uppercase" }}>
        People · HRMS
      </div>
    </div>
  );
}

/* ── Tiny line icons ── */
const I = {
  mail: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  user: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0114 0" strokeLinecap="round"/></svg>,
  check: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrow: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  shieldsm: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 9V6a2 2 0 012-2h10a2 2 0 012 2v14H5z" strokeLinejoin="round"/><path d="M9 8h2M9 12h2M9 16h2M14 12h2M14 16h2" strokeLinecap="round"/></svg>,
  clock: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevron: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

type Theme = typeof ct;

/* ── Eyebrow ── */
function Eyebrow({ children, color = NWL.muted }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600,
    letterSpacing: "0.16em", textTransform: "uppercase", color }}>{children}</div>;
}

/* ── Text field ── */
function Field({ label, placeholder, value, onChange, type = "text", t, icon, autoFocus }: {
  label?: string; placeholder?: string; value: string; onChange: (v: string) => void;
  type?: string; t: Theme; icon?: React.ReactNode; autoFocus?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: "block" }}>
      {label && <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 12.5, fontWeight: 600,
        color: t.label, marginBottom: 7, letterSpacing: "-0.01em" }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 9, height: 50,
        background: t.fieldBg, borderRadius: 13, padding: "0 14px",
        border: `1.5px solid ${focus ? t.primary : t.fieldBorder}`,
        boxShadow: focus ? `0 0 0 3px ${t.primary}1f` : "none", transition: "border-color .15s, box-shadow .15s" }}>
        {icon && <span style={{ display: "flex", color: t.icon, flex: "0 0 auto" }}>{icon}</span>}
        <input type={type} value={value} placeholder={placeholder} autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 15, fontWeight: 500, color: t.text,
            letterSpacing: "-0.01em" }} />
      </div>
    </label>
  );
}

/* ── Multi-line message field ── */
function TextArea({ label, placeholder, value, onChange, t, rows = 5, hint }: {
  label?: string; placeholder?: string; value: string; onChange: (v: string) => void;
  t: Theme; rows?: number; hint?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: "block" }}>
      {label && <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 12.5, fontWeight: 600, color: t.label, letterSpacing: "-0.01em" }}>{label}</span>
        {hint && <span style={{ fontSize: 11.5, color: t.muted, fontFamily: "'JetBrains Mono', monospace" }}>{hint}</span>}
      </div>}
      <div style={{ background: t.fieldBg, borderRadius: 13, padding: "12px 14px",
        border: `1.5px solid ${focus ? t.primary : t.fieldBorder}`,
        boxShadow: focus ? `0 0 0 3px ${t.primary}1f` : "none", transition: "border-color .15s, box-shadow .15s" }}>
        <textarea rows={rows} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", resize: "none",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 15, fontWeight: 500, color: t.text,
            letterSpacing: "-0.01em", lineHeight: 1.55 }} />
      </div>
    </label>
  );
}

/* ── Styled native select ── */
function Select({ label, value, onChange, options, placeholder, t }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; t: Theme;
}) {
  const [focus, setFocus] = useState(false);
  const empty = !value;
  return (
    <label style={{ display: "block" }}>
      {label && <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 12.5, fontWeight: 600,
        color: t.label, marginBottom: 7, letterSpacing: "-0.01em" }}>{label}</div>}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 9, height: 50,
        background: t.fieldBg, borderRadius: 13, padding: "0 14px",
        border: `1.5px solid ${focus ? t.primary : t.fieldBorder}`,
        boxShadow: focus ? `0 0 0 3px ${t.primary}1f` : "none", transition: "border-color .15s, box-shadow .15s" }}>
        <select value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            appearance: "none", WebkitAppearance: "none", cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif", fontSize: 15, fontWeight: 500,
            color: empty ? "#A6AEBE" : t.text, letterSpacing: "-0.01em" }}>
          <option value="" disabled>{placeholder}</option>
          {options.map(o => <option key={o} value={o} style={{ color: NWL.ink }}>{o}</option>)}
        </select>
        <span style={{ color: t.icon, flex: "0 0 auto", display: "flex", pointerEvents: "none" }}>{I.chevron}</span>
      </div>
    </label>
  );
}

/* ── Topic chips (single select) ── */
function Chips({ label, value, onChange, options, t }: {
  label?: string; value: string; onChange: (v: string) => void; options: string[]; t: Theme;
}) {
  return (
    <div>
      {label && <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 12.5, fontWeight: 600,
        color: t.label, marginBottom: 9, letterSpacing: "-0.01em" }}>{label}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(o => {
          const on = o === value;
          return (
            <button key={o} type="button" onClick={() => onChange(o)}
              style={{ height: 38, padding: "0 16px", borderRadius: 10, cursor: "pointer",
                border: `1.5px solid ${on ? t.primary : t.fieldBorder}`,
                background: on ? NWL.tint : "#fff", color: on ? NWL.blue : NWL.steel,
                fontFamily: "'Inter Tight', sans-serif", fontSize: 13.5, fontWeight: 600,
                letterSpacing: "-0.01em", transition: "all .14s", whiteSpace: "nowrap" }}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Left panel contact-detail row ── */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, flex: "0 0 auto",
        background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)",
        color: "#fff", display: "grid", placeItems: "center" }}>{icon}</span>
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600,
          letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginTop: 3, letterSpacing: "-0.01em" }}>{value}</div>
      </div>
    </div>
  );
}

/* ── Left ink panel ── */
function ContactAside() {
  return (
    <div style={{ width: "42%", minWidth: 380, background: NWL.ink, position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "50px 48px" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .5,
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 0)",
        backgroundSize: "22px 22px" }} />
      <div style={{ position: "absolute", right: -90, top: -70, width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, rgba(30,91,255,.6), transparent 68%)",
        animation: "nwl-drift 9s ease-in-out infinite" }} />
      <div style={{ position: "absolute", left: -70, bottom: -96, opacity: .07, pointerEvents: "none" }}>
        <NMark size={380} tile="#fff" rx={74} />
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
        <NMark size={46} tile="#fff" accent={NWL.blue} rx={13} />
        <Wordmark size={18} color="#fff" sub="rgba(255,255,255,.55)" />
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
            color: NWL.blue2, letterSpacing: "0.14em", whiteSpace: "nowrap" }}>— TALK TO US</span>
          <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.16)" }} />
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1.12 }}>
          Let&rsquo;s get your<br />people ops<br /><span style={{ color: NWL.blue2 }}>running right.</span>
        </div>
        <div style={{ fontSize: 15.5, color: "rgba(255,255,255,.66)", marginTop: 20, lineHeight: 1.55, maxWidth: 360 }}>
          Book a walkthrough, ask about pricing, or get help migrating from your current HR stack. A real human on the team will reply.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 34 }}>
          <DetailRow icon={I.mail} label="Email" value="hello@northweblabs.com" />
        </div>
      </div>

      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 9, alignSelf: "flex-start",
        padding: "11px 16px", borderRadius: 12, background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.1)" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: NWL.mint, flex: "0 0 auto",
          animation: "nwl-pulse 2s infinite" }} />
        <span style={{ display: "flex", color: "rgba(255,255,255,.6)" }}>{I.clock}</span>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,.92)" }}>
          Avg. reply in <b style={{ color: "#fff" }}>under 2 hours</b>
        </span>
      </div>
    </div>
  );
}

/* ── Success state ── */
const linkBtnC: React.CSSProperties = { border: "none", background: "none", color: NWL.blue, fontWeight: 600,
  fontSize: 13, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", padding: 0 };

function ContactSuccess({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <div style={{ width: 420, maxWidth: "100%", animation: "nwl-up .5s ease both" }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: NWL.mint, color: "#fff",
        display: "grid", placeItems: "center", boxShadow: `0 12px 28px ${NWL.mint}55` }}>{I.check}</div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.04em", color: NWL.ink, marginTop: 22 }}>Message sent.</div>
      <div style={{ fontSize: 15, color: NWL.muted, marginTop: 12, lineHeight: 1.55 }}>
        Thanks for reaching out. We&rsquo;ve sent a confirmation to <b style={{ color: NWL.ink }}>{email || "your inbox"}</b> and
        someone from the team will get back to you shortly.
      </div>
      <div style={{ marginTop: 26 }}>
        <button onClick={onReset} style={{ ...linkBtnC, fontSize: 14 }}>← Send another message</button>
      </div>
    </div>
  );
}

/* ── Form column ── */
function ContactForm() {
  const t = ct;
  const blank = { name: "", email: "", company: "", size: "", topic: "Book a demo", message: "" };
  const [st, setSt] = useState(blank);
  const set = (k: keyof typeof blank) => (v: string) => setSt(s => ({ ...s, [k]: v }));
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(false);

  const valid = st.name.trim() && /\S+@\S+\.\S+/.test(st.email) && st.message.trim().length > 4;
  const submit = () => { if (!valid) { setErr(true); return; } setSent(true); };

  if (sent) return <ContactSuccess email={st.email} onReset={() => { setSent(false); setSt(blank); setErr(false); }} />;

  return (
    <div style={{ width: 480, maxWidth: "100%" }}>
      <Eyebrow color={NWL.blue}>Contact</Eyebrow>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", color: NWL.ink, marginTop: 10, lineHeight: 1.05 }}>
        Send us a message
      </div>
      <div style={{ fontSize: 15, color: NWL.muted, marginTop: 10, lineHeight: 1.5, marginBottom: 28 }}>
        Tell us a bit about your team and what you need — we&rsquo;ll point you to the right person.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field t={t} label="Full name" placeholder="Ananya Iyer" icon={I.user} value={st.name} onChange={set("name")} autoFocus />
          <Field t={t} label="Work email" placeholder="ananya@company.com" icon={I.mail} type="email" value={st.email} onChange={set("email")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field t={t} label="Company" placeholder="Acme Corp" icon={I.shieldsm} value={st.company} onChange={set("company")} />
          <Select t={t} label="Team size" placeholder="Select…" value={st.size} onChange={set("size")}
            options={["1–20", "21–100", "101–500", "500+"]} />
        </div>

        <Chips t={t} label="What's this about?" value={st.topic} onChange={set("topic")}
          options={["Book a demo", "Pricing", "Migration", "Support", "Partnership"]} />

        <TextArea t={t} label="Message" hint={`${st.message.length} chars`}
          placeholder="We're a 60-person team moving off spreadsheets and want to see payroll + leave in action…"
          value={st.message} onChange={set("message")} rows={5} />

        {err && !valid && (
          <div style={{ fontSize: 13, color: "#E5484D", fontFamily: "'Inter Tight', sans-serif", fontWeight: 500, marginTop: -2 }}>
            Please add your name, a valid work email, and a short message.
          </div>
        )}

        <div style={{ marginTop: 4 }}>
          <button onClick={submit}
            style={{ width: "100%", height: 52, borderRadius: 14, border: "none",
              background: t.primary, color: t.onPrimary,
              fontFamily: "'Inter Tight', sans-serif", fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, whiteSpace: "nowrap", boxShadow: t.btnShadow,
              transition: "transform .1s, box-shadow .15s" }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(.985)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
            Send message {I.arrow}
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: NWL.muted, lineHeight: 1.5, textAlign: "center" }}>
          By submitting you agree to our <a href="/privacy" style={{ color: NWL.blue, fontWeight: 600, textDecoration: "none" }}>privacy policy</a>. No spam, ever.
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function ContactPage() {
  return (
    <div className="ct-page" style={{ fontFamily: "'Inter Tight', system-ui, sans-serif", background: "#fff" }}>
      <ContactAside />
      <div className="ct-formcol" style={{ flex: 1, background: "#fff", display: "grid", placeItems: "center", padding: "56px 48px" }}>
        <ContactForm />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .ct-page { display: flex; min-height: 100vh; }
        .ct-page input::placeholder, .ct-page textarea::placeholder { color: #A6AEBE; }
        @keyframes nwl-drift { 0%,100%{ transform: translate(0,0) scale(1);} 50%{ transform: translate(18px,-14px) scale(1.08);} }
        @keyframes nwl-pulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(35,197,138,.5);} 50%{ box-shadow: 0 0 0 7px rgba(35,197,138,0);} }
        @keyframes nwl-up { from{ opacity:0; transform: translateY(10px);} to{ opacity:1; transform: translateY(0);} }
        @media (max-width: 880px) {
          .ct-page { flex-direction: column; }
          .ct-page > div:first-child { width: 100% !important; min-width: 0 !important; padding: 36px 28px !important; }
          .ct-formcol { padding: 40px 28px !important; }
        }
        @media (prefers-reduced-motion: reduce){ .ct-page *{ animation: none !important; } }
      ` }} />
    </div>
  );
}