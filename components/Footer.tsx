import Link from 'next/link';
import React from 'react';

/* ============================================================
   NorthWeb Labs — Footer component (big)
   File: components/Footer.tsx
   Usage: import Footer from '@/components/Footer';  <Footer />
   Self-contained: ships its own scoped CSS (nwlf- prefix),
   no styled-jsx, no external CSS needed. Server component.
   ============================================================ */

const ArrowRight = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const COLUMNS: { title: string; links: { label: string; href: string; badge?: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'People directory', href: '/product/people' },
      { label: 'Attendance & time', href: '/product/attendance' },
      { label: 'Leave management', href: '/product/leave' },
      { label: 'Payroll & compliance', href: '/product/payroll' },
      { label: 'Performance', href: '/product/performance' },
      { label: 'AI assistant', href: '/product/ai', badge: 'New' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Startups', href: '/solutions/startups' },
      { label: 'Mid-size teams', href: '/solutions/mid-size' },
      { label: 'Enterprise', href: '/solutions/enterprise' },
      { label: 'Remote teams', href: '/solutions/remote' },
      { label: 'Agencies', href: '/solutions/agencies' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Customers', href: '/customers' },
      { label: 'Careers', href: '/careers', badge: 'Hiring' },
      { label: 'Blog', href: '/blog' },
      { label: 'Press', href: '/press' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help center', href: '/help' },
      { label: 'API docs', href: '/docs/api' },
      { label: 'Security', href: '/security' },
      { label: 'Status', href: '/status' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
];

const SOCIALS = [
  {
    label: 'X (Twitter)',
    href: 'https://x.com/northweblabs',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/northweblabs',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@northweblabs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.6 15.6V8.4l6.27 3.6L9.6 15.6Z" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com/northweblabs',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.55v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.26.72-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.76 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.08 0 4.42-2.7 5.39-5.27 5.67.41.36.78 1.06.78 2.14v3.18c0 .3.2.66.8.55A11.5 11.5 0 0 0 12 .5Z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="nwlf">
      {/* Top: brand + newsletter */}
      <div className="nwlf-container nwlf-top">
        <div className="nwlf-brand">
          <Link href="/" className="nwlf-logo" aria-label="NorthWeb Labs home">
            <span className="nwlf-logo-mark" aria-hidden="true">N</span>
            <span className="nwlf-logo-text">NorthWeb <span className="nwlf-logo-accent">Labs</span></span>
          </Link>
          <p className="nwlf-tagline">
            The people platform for modern teams.<br />
            Attendance to payroll, beautifully done.
          </p>
          <div className="nwlf-socials">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} className="nwlf-social" aria-label={s.label} target="_blank" rel="noopener noreferrer">
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="nwlf-news">
          <h4>Stay in the loop</h4>
          <p>Product updates and people-ops tips, once a month. No spam.</p>
          <form className="nwlf-news-form" action="/api/newsletter" method="POST">
            <input
              type="email"
              name="email"
              required
              placeholder="you@company.com"
              aria-label="Email address"
              className="nwlf-input"
            />
            <button type="submit" className="nwlf-btn">Subscribe <ArrowRight /></button>
          </form>
          <div className="nwlf-badges">
            <span className="nwlf-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
              ISO 27001
            </span>
            <span className="nwlf-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              SOC 2 Type II
            </span>
            <span className="nwlf-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20Z" /></svg>
              India data residency
            </span>
          </div>
        </div>
      </div>

      {/* Middle: link columns */}
      <div className="nwlf-container nwlf-cols">
        {COLUMNS.map((col) => (
          <div key={col.title} className="nwlf-col">
            <h5>{col.title}</h5>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className="nwlf-link">
                {l.label}
                {l.badge && <span className="nwlf-tag">{l.badge}</span>}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* CTA strip */}
      <div className="nwlf-container">
        <div className="nwlf-cta">
          <div>
            <h4>Ready to give your people team their time back?</h4>
            <p>Free for 14 days · No credit card · We&rsquo;ll migrate your data</p>
          </div>
          <div className="nwlf-cta-actions">
            <Link href="/signup" className="nwlf-btn">Start free <ArrowRight /></Link>
            <Link href="/demo" className="nwlf-btn ghost">Book a demo</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="nwlf-container nwlf-bottom">
        <span className="nwlf-copy">© 2026 NorthWeb Labs · People · HRMS</span>
        <div className="nwlf-legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/sitemap">Sitemap</Link>
        </div>
        <span className="nwlf-status">
          <i className="nwlf-status-dot" aria-hidden="true" />
          <Link href="/status">All systems operational</Link>
        </span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .nwlf {
          background: #0b1220; color: #aab3c5;
          padding: 84px 0 36px; font-size: 15px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .nwlf a { text-decoration: none; color: inherit; }
        .nwlf-container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }

        /* Top */
        .nwlf-top {
          display: grid; grid-template-columns: 1.2fr 1fr;
          gap: 56px; padding-bottom: 56px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .nwlf-logo { display: inline-flex; align-items: center; gap: 10px; }
        .nwlf-logo-mark {
          width: 38px; height: 38px; border-radius: 10px; background: #fff;
          color: #0b1220; display: inline-flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 20px;
        }
        .nwlf-logo-text { font-weight: 800; font-size: 19px; color: #fff; }
        .nwlf-logo-accent { color: #7ea4f7; }
        .nwlf-tagline { margin-top: 20px; line-height: 1.7; max-width: 340px; }
        .nwlf-socials { display: flex; gap: 12px; margin-top: 26px; }
        .nwlf-social {
          width: 40px; height: 40px; border-radius: 11px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          display: inline-flex; align-items: center; justify-content: center;
          color: #c7cfdd; transition: background 0.15s, color 0.15s, transform 0.15s;
        }
        .nwlf-social:hover { background: #2563eb; color: #fff; transform: translateY(-2px); }

        /* Newsletter */
        .nwlf-news h4 { color: #fff; font-size: 19px; font-weight: 800; }
        .nwlf-news > p { margin: 10px 0 18px; line-height: 1.6; }
        .nwlf-news-form { display: flex; gap: 10px; }
        .nwlf-input {
          flex: 1; min-width: 0; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.16); border-radius: 12px;
          padding: 13px 16px; color: #fff; font-size: 15px; outline: none;
          transition: border-color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .nwlf-input::placeholder { color: #7e8aa0; }
        .nwlf-input:focus { border-color: #2563eb; background: rgba(255,255,255,0.09); }
        .nwlf-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #2563eb; color: #fff; border: none; cursor: pointer;
          font-size: 15px; font-weight: 700; border-radius: 12px; padding: 13px 22px;
          white-space: nowrap; transition: background 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .nwlf-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
        .nwlf-btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,0.35); }
        .nwlf-btn.ghost:hover { background: rgba(255,255,255,0.08); }
        .nwlf-badges { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .nwlf-badge {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 12.5px; font-weight: 600; color: #c7cfdd;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px; padding: 6px 13px;
        }

        /* Link columns */
        .nwlf-cols {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 40px; padding-top: 56px; padding-bottom: 64px;
        }
        .nwlf-col { display: flex; flex-direction: column; gap: 13px; }
        .nwlf-col h5 {
          color: #fff; font-size: 13px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px;
        }
        .nwlf-link {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: 14.5px; color: #aab3c5; width: fit-content;
          transition: color 0.15s;
        }
        .nwlf-link:hover { color: #fff; }
        .nwlf-tag {
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
          text-transform: uppercase; color: #7ea4f7;
          background: rgba(59,110,245,0.16); border: 1px solid rgba(59,110,245,0.35);
          border-radius: 999px; padding: 2px 8px;
        }

        /* CTA strip */
        .nwlf-cta {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 24px;
          background: linear-gradient(120deg, rgba(32,87,224,0.25), rgba(59,110,245,0.12));
          border: 1px solid rgba(59,110,245,0.35);
          border-radius: 20px; padding: 32px 36px;
        }
        .nwlf-cta h4 { color: #fff; font-size: 20px; font-weight: 800; }
        .nwlf-cta p { margin-top: 8px; font-size: 14px; color: #b9c3d8; }
        .nwlf-cta-actions { display: flex; gap: 12px; flex-wrap: wrap; }

        /* Bottom */
        .nwlf-bottom {
          margin-top: 56px; padding-top: 28px;
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
        }
        .nwlf-copy {
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          font-size: 12.5px; color: #7e8aa0;
        }
        .nwlf-legal { display: flex; gap: 24px; flex-wrap: wrap; }
        .nwlf-legal a { font-size: 13.5px; color: #aab3c5; transition: color 0.15s; }
        .nwlf-legal a:hover { color: #fff; }
        .nwlf-status { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; }
        .nwlf-status a { color: #aab3c5; transition: color 0.15s; }
        .nwlf-status a:hover { color: #fff; }
        .nwlf-status-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
        }

        /* Responsive */
        @media (max-width: 980px) {
          .nwlf-top { grid-template-columns: 1fr; gap: 40px; }
          .nwlf-cols { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 560px) {
          .nwlf { padding-top: 60px; }
          .nwlf-cols { grid-template-columns: 1fr; gap: 32px; }
          .nwlf-news-form { flex-direction: column; }
          .nwlf-cta { padding: 26px 22px; }
          .nwlf-bottom { flex-direction: column; align-items: flex-start; }
        }
      ` }} />
    </footer>
  );
}