"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Users, Rocket, IndianRupee, Umbrella, BarChart2, Shield,
} from "lucide-react";

// ─── Isometric City Illustration (SVG) ────────────────────────────────────────

function IsometricCity() {
  return (
    <svg
      viewBox="0 0 520 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-label="Isometric city illustration representing an HR platform"
    >
      {/* Ground grid platform */}
      <g opacity="0.5">
        {/* Grid lines horizontal */}
        {[0,1,2,3,4,5,6].map((i) => (
          <line
            key={`h${i}`}
            x1={160 + i * 30}
            y1={220 + i * 17}
            x2={320 + i * 30}
            y2={220 + i * 17}
            stroke="#c7d2fe"
            strokeWidth="0.5"
          />
        ))}
        {/* Grid lines vertical */}
        {[0,1,2,3,4,5,6,7].map((i) => (
          <line
            key={`v${i}`}
            x1={160 + i * 25}
            y1={220}
            x2={160 + i * 25 - 30}
            y2={322}
            stroke="#c7d2fe"
            strokeWidth="0.5"
          />
        ))}
      </g>

      {/* Base platform outline */}
      <polygon
        points="260,190 430,275 340,360 170,275"
        fill="#f0f4ff"
        stroke="#6366f1"
        strokeWidth="1"
        opacity="0.6"
      />

      {/* ── Building 1: tall dark tower (right) ── */}
      <g>
        {/* front face */}
        <polygon points="370,180 400,196 400,290 370,274" fill="#0f172a" />
        {/* top face */}
        <polygon points="350,170 380,186 400,196 370,180" fill="#1e293b" />
        {/* side face */}
        <polygon points="380,186 400,196 400,290 380,280" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
        {/* windows */}
        {[0,1,2,3,4].map(row => (
          <g key={row}>
            <rect x={374} y={192 + row * 16} width={8} height={10} fill="#3b82f6" opacity="0.7" rx="1"/>
            <rect x={386} y={192 + row * 16} width={8} height={10} fill="#3b82f6" opacity="0.4" rx="1"/>
          </g>
        ))}
        {/* antenna */}
        <line x1="375" y1="170" x2="375" y2="155" stroke="#334155" strokeWidth="2"/>
        <circle cx="375" cy="153" r="3" fill="#3b82f6"/>
      </g>

      {/* ── Building 2: medium building (center-right) ── */}
      <g>
        <polygon points="310,220 345,238 345,305 310,287" fill="#1e40af" />
        <polygon points="290,210 325,228 345,238 310,220" fill="#2563eb" />
        <polygon points="325,228 345,238 345,305 325,295" fill="#1d4ed8" />
        {[0,1,2,3].map(row => (
          <g key={row}>
            <rect x={314} y={228 + row * 17} width={9} height={11} fill="white" opacity="0.25" rx="1"/>
            <rect x={327} y={228 + row * 17} width={9} height={11} fill="white" opacity="0.15" rx="1"/>
          </g>
        ))}
        {/* rooftop detail */}
        <polygon points="290,210 325,228 325,220 290,202" fill="#3b82f6" opacity="0.5"/>
      </g>

      {/* ── Building 3: short wide warehouse (center-left) ── */}
      <g>
        <polygon points="215,245 270,270 270,315 215,290" fill="#334155" />
        <polygon points="200,237 255,262 270,270 215,245" fill="#475569" />
        <polygon points="255,262 270,270 270,315 255,307" fill="#1e293b" />
        {/* large door */}
        <polygon points="225,268 245,277 245,290 225,281" fill="#0f172a" />
        {/* skylights */}
        <rect x={220} y={242} width={15} height={8} fill="#93c5fd" opacity="0.4" rx="1"/>
        <rect x={240} y={248} width={15} height={8} fill="#93c5fd" opacity="0.3" rx="1"/>
      </g>

      {/* ── Building 4: small cube (far left) ── */}
      <g>
        <polygon points="195,265 225,280 225,310 195,295" fill="#1e40af" opacity="0.8"/>
        <polygon points="180,258 210,273 225,280 195,265" fill="#3b82f6" opacity="0.8"/>
        <polygon points="210,273 225,280 225,310 210,303" fill="#1d4ed8" opacity="0.8"/>
        <rect x={198} y={270} width={10} height={13} fill="white" opacity="0.2" rx="1"/>
        <rect x={212} y={270} width={8} height={13} fill="white" opacity="0.15" rx="1"/>
      </g>

      {/* ── Curved ramp / bridge element ── */}
      <g>
        <path
          d="M 270 310 Q 290 295 310 305 Q 330 315 340 330"
          stroke="#6366f1"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 270 315 Q 290 300 310 310 Q 330 320 340 335"
          stroke="#e0e7ff"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* ── Street lamp posts ── */}
      {[
        [185, 230], [430, 260], [355, 345], [240, 360], [455, 310], [310, 375]
      ].map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 35} stroke="#475569" strokeWidth="1.5"/>
          <line x1={x} y1={y} x2={x + 10} y2={y - 5} stroke="#475569" strokeWidth="1.5"/>
          <circle cx={x + 10} cy={y - 5} r={4} fill="#fbbf24" opacity="0.8"/>
          <circle cx={x + 10} cy={y - 5} r={7} fill="#fbbf24" opacity="0.15"/>
        </g>
      ))}

      {/* ── Small decorative elements ── */}
      {/* floating circles/nodes */}
      {[
        [350, 155, "#3b82f6", 0.6],
        [420, 230, "#6366f1", 0.4],
        [200, 200, "#3b82f6", 0.3],
        [460, 350, "#6366f1", 0.5],
        [175, 310, "#3b82f6", 0.4],
      ].map(([x, y, fill, op], i) => (
        <g key={i}>
          <circle cx={x as number} cy={y as number} r={6} fill={fill as string} opacity={op as number}/>
          <circle cx={x as number} cy={y as number} r={10} fill={fill as string} opacity={(op as number) * 0.3}/>
          {/* connector lines */}
          <line
            x1={x as number} y1={(y as number) + 10}
            x2={x as number} y2={(y as number) + 20}
            stroke={fill as string} strokeWidth="1" opacity="0.4"
          />
        </g>
      ))}

      {/* People figures on ground */}
      {[
        [290, 320], [320, 340], [260, 340]
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y - 8} r={4} fill="#6366f1" opacity="0.7"/>
          <line x1={x} y1={y - 4} x2={x} y2={y + 8} stroke="#6366f1" strokeWidth="2" opacity="0.7"/>
          <line x1={x - 4} y1={y + 2} x2={x + 4} y2={y + 2} stroke="#6366f1" strokeWidth="1.5" opacity="0.7"/>
        </g>
      ))}

      {/* Floating X marker on tall building */}
      <g transform="translate(358, 162)">
        <circle cx="0" cy="0" r="8" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
        <line x1="-4" y1="-4" x2="4" y2="4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="4" y1="-4" x2="-4" y2="4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
      </g>

      {/* Location pin on center building */}
      <g transform="translate(315, 200)">
        <circle cx="0" cy="0" r="6" fill="#3b82f6"/>
        <circle cx="0" cy="0" r="3" fill="white"/>
        <line x1="0" y1="6" x2="0" y2="14" stroke="#3b82f6" strokeWidth="1.5"/>
      </g>

      {/* Data connection lines */}
      <line x1="350" y1="163" x2="315" y2="203" stroke="#c7d2fe" strokeWidth="0.8" strokeDasharray="4 3"/>
      <line x1="315" y1="203" x2="280" y2="250" stroke="#c7d2fe" strokeWidth="0.8" strokeDasharray="4 3"/>
    </svg>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm" : "bg-white"
      } border-b border-gray-100`}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-nwl.png"
            alt="NorthWeb Labs"
            width={60}
            height={90}
            priority
            className="flex-shrink-0"
          />
          <span className="text-sm font-bold text-[#0f172a] tracking-tight">
            NorthWeb Labs
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {["Product", "Solutions", "Pricing", "Customers", "Resources"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <a href="#" className="hidden sm:block text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </a>
          <a
            href="#"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] text-white text-sm font-medium rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            Book a demo
            <span className="text-xs">→</span>
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="min-h-screen pt-14 flex items-center bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16 lg:py-24">

          {/* Left: text */}
          <div
            className={`transition-all duration-700 ease-out ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
              <span className="text-xs text-gray-500 font-medium tracking-wide">
                Now hiring · Series A · 200+ teams
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-6xl font-black text-[#0f172a] leading-[1.05] tracking-tight mb-6">
              Run your
              <br />
              <span className="text-[#3b82f6]">whole HR stack</span>
              <br />
              from one place.
            </h1>

            {/* Subtext */}
            <p className="text-base text-gray-500 leading-relaxed mb-10 max-w-sm">
              Hiring, onboarding, payroll, time-off, performance —
              NorthWeb Labs gives your people team a single, calm city
              to operate in.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e293b] transition-all hover:gap-3"
              >
                Start free trial
                <span>→</span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0f172a] text-sm font-semibold rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Watch the tour
              </a>
            </div>

            {/* Social proof stats */}
            <div className="flex items-center gap-10 mt-12 pt-10 border-t border-gray-100">
              {[
                { value: "1,200+", label: "teams" },
                { value: "98%", label: "retention" },
                { value: "SOC 2", label: "Type I" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-xl font-black text-[#0f172a] leading-none mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: illustration */}
          <div
            className={`transition-all duration-700 delay-200 ease-out ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            } flex items-center justify-center`}
          >
            <div className="w-full max-w-xl">
              <IsometricCity />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature strip ────────────────────────────────────────────────────────────

function FeatureStrip() {
  const features = [
    { icon: <Users className="w-5 h-5" />, title: "Hiring", desc: "ATS built for speed", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: <Rocket className="w-5 h-5" />, title: "Onboarding", desc: "Day-one ready", color: "text-indigo-600", bg: "bg-indigo-50" },
    { icon: <IndianRupee className="w-5 h-5" />, title: "Payroll", desc: "India-compliant, auto", color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: <Umbrella className="w-5 h-5" />, title: "Time-off", desc: "Policies that just work", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: <BarChart2 className="w-5 h-5" />, title: "Performance", desc: "Reviews without dread", color: "text-purple-600", bg: "bg-purple-50" },
    { icon: <Shield className="w-5 h-5" />, title: "Compliance", desc: "PF, ESI, TDS — handled", color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <section className="border-t border-gray-100 bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10">
          Everything your people team needs
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors group cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-lg ${f.bg} ${f.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                {f.icon}
              </div>
              <p className="text-sm font-semibold text-[#0f172a] mb-1 group-hover:text-[#3b82f6] transition-colors">
                {f.title}
              </p>
              <p className="text-xs text-gray-400 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Social proof logos ───────────────────────────────────────────────────────

function SocialProof() {
  const logos = [
    "Razorpay", "Zepto", "Meesho", "Groww", "upGrad", "PhonePe", "Zomato", "Ola"
  ];

  return (
    <section className="py-14 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs text-gray-400 font-medium mb-8">
          Trusted by fast-growing teams across India
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-sm font-bold text-gray-300 hover:text-gray-400 transition-colors tracking-tight"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Feature highlight ────────────────────────────────────────────────────────

function FeatureHighlight() {
  const highlights = [
    {
      eyebrow: "Payroll",
      title: "Run payroll in minutes, not hours.",
      desc: "Auto-calculate PF, ESI, PT, and TDS. Generate salary slips and send them via WhatsApp. One click — done.",
      stat: "94%",
      statLabel: "reduction in payroll errors",
      accent: "#3b82f6",
      bg: "bg-blue-50",
    },
    {
      eyebrow: "Attendance",
      title: "Your staff check in on WhatsApp.",
      desc: "No app to install. Employees send 'IN' on WhatsApp and you see it live on your dashboard. Geo-tagged, time-stamped.",
      stat: "< 30s",
      statLabel: "average check-in time",
      accent: "#6366f1",
      bg: "bg-indigo-50",
    },
    {
      eyebrow: "Compliance",
      title: "Never miss a filing deadline again.",
      desc: "Auto-generated compliance calendar for PF, ESIC, PT, TDS, and GST. Alerts 30 days before every due date.",
      stat: "₹0",
      statLabel: "in penalties for our customers",
      accent: "#0f172a",
      bg: "bg-gray-50",
    },
  ];

  return (
    <section className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-[#0f172a] tracking-tight mb-4">
            Built for how India works.
          </h2>
          <p className="text-base text-gray-500 max-w-md mx-auto">
            Not a US HR tool bolted onto an India compliance layer. Built from the ground up for Indian MSMEs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((h) => (
            <div
              key={h.eyebrow}
              className={`${h.bg} rounded-2xl p-8 border border-gray-100 hover:scale-[1.01] transition-transform duration-200`}
            >
              <span
                className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-4"
                style={{ background: h.accent + "20", color: h.accent }}
              >
                {h.eyebrow}
              </span>
              <h3 className="text-lg font-bold text-[#0f172a] leading-snug mb-3">
                {h.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-8">
                {h.desc}
              </p>
              <div className="border-t border-gray-200 pt-6">
                <p className="text-3xl font-black" style={{ color: h.accent }}>
                  {h.stat}
                </p>
                <p className="text-xs text-gray-400 mt-1">{h.statLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "₹999",
      period: "/mo",
      desc: "Up to 25 employees",
      features: [
        "WhatsApp attendance",
        "Basic payroll (fixed salary)",
        "Digital salary slips",
        "PF/ESI auto-calculation",
        "Leave tracking",
      ],
      cta: "Start free trial",
      highlighted: false,
    },
    {
      name: "Growth",
      price: "₹2,499",
      period: "/mo",
      desc: "Up to 75 employees",
      features: [
        "Everything in Starter",
        "Variable pay + overtime",
        "Geo-tagged attendance",
        "AI document generation",
        "Compliance calendar alerts",
        "PT (state-wise) auto-calc",
      ],
      cta: "Start free trial",
      highlighted: true,
    },
    {
      name: "Scale",
      price: "₹3,999",
      period: "/mo",
      desc: "Up to 200 employees",
      features: [
        "Everything in Growth",
        "Shift + multi-location",
        "Form 16 generation",
        "ESIC / gratuity tracking",
        "CA firm access",
        "Priority phone support",
      ],
      cta: "Talk to sales",
      highlighted: false,
    },
  ];

  return (
    <section className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-[#0f172a] tracking-tight mb-4">
            Simple, honest pricing.
          </h2>
          <p className="text-base text-gray-500">
            No setup fees. No per-user gotchas. Cancel any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-7 flex flex-col ${
                plan.highlighted
                  ? "bg-[#0f172a] text-white border-2 border-[#3b82f6] scale-[1.02]"
                  : "bg-white border border-gray-200"
              }`}
            >
              {plan.highlighted && (
                <span className="inline-block mb-3 px-3 py-1 bg-[#3b82f6] text-white text-xs font-semibold rounded-full self-start">
                  Most popular
                </span>
              )}
              <h3
                className={`text-sm font-semibold mb-1 ${
                  plan.highlighted ? "text-blue-300" : "text-gray-500"
                }`}
              >
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span
                  className={`text-3xl font-black ${
                    plan.highlighted ? "text-white" : "text-[#0f172a]"
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ${
                    plan.highlighted ? "text-blue-300" : "text-gray-400"
                  }`}
                >
                  {plan.period}
                </span>
              </div>
              <p
                className={`text-xs mb-6 ${
                  plan.highlighted ? "text-blue-300" : "text-gray-400"
                }`}
              >
                {plan.desc}
              </p>

              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <span
                      className={`mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? "text-blue-400" : "text-emerald-500"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={
                        plan.highlighted ? "text-blue-100" : "text-gray-600"
                      }
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`w-full py-2.5 text-sm font-semibold rounded-lg text-center transition-colors ${
                  plan.highlighted
                    ? "bg-[#3b82f6] text-white hover:bg-blue-500"
                    : "bg-[#0f172a] text-white hover:bg-[#1e293b]"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="py-24 bg-[#0f172a]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-black text-white tracking-tight mb-4">
          Your whole HR stack.
          <br />
          <span className="text-[#3b82f6]">Finally, in one place.</span>
        </h2>
        <p className="text-base text-gray-400 mb-10">
          Join 1,200+ teams already running on NorthWeb Labs.
          14-day free trial, no credit card required.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href="#"
            className="px-8 py-3.5 bg-[#3b82f6] text-white text-sm font-semibold rounded-lg hover:bg-blue-500 transition-colors"
          >
            Start free trial →
          </a>
          <a
            href="#"
            className="px-8 py-3.5 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20"
          >
            Book a demo
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const links = {
    Product: ["Features", "Pricing", "Changelog", "Roadmap"],
    Company: ["About", "Blog", "Careers", "Press"],
    Legal: ["Privacy", "Terms", "Security", "GDPR"],
    Support: ["Docs", "Status", "Contact", "Community"],
  };

  return (
    <footer className="bg-white border-t border-gray-100 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo-nwl.png"
                alt="NorthWeb Labs"
                width={120}
                height={200}
              />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[160px]">
              HR & Payroll OS for Indian small businesses.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-[#0f172a] mb-4 uppercase tracking-wider">
                {section}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            © 2026 NorthWeb Labs. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">
            Made with care in Pune, India
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="font-sans">
      <Nav />
      <Hero />
      <SocialProof />
      <FeatureStrip />
      <FeatureHighlight />
      <Pricing />
      <CTABanner />
      <Footer />
    </main>
  );
}