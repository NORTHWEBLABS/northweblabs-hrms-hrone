import type { Theme, Header, Block } from "@/components/site/SiteHome";

export const DEFAULT_THEME: Theme = {
  brand: "#2563eb", ink: "#0b1220", bg: "#ffffff", font: "system",
  logoUrl: "/logo-nwl.png", logoText: "NorthWeb", logoAccent: "Labs",
};

export const DEFAULT_HEADER: Header = {
  nav: [
    { label: "Product", href: "/product" },
    { label: "Pricing", href: "/pricing" },
    { label: "Customers", href: "/customers" },
  ],
  signinLabel: "Sign in", ctaLabel: "Start free", ctaHref: "/signup",
};

export const DEFAULT_SECTIONS: Block[] = [
  {
    id: "hero", type: "hero", enabled: true,
    data: {
      desktop: {
        pill: "The HR operating system",
        headline: "Run your whole\nHR stack from", accent: "one calm place.",
        sub: "Hiring, payroll, time-off and performance — for 1,200+ teams, in a single workspace.",
        ctas: [
          { label: "Start free trial", href: "/signup", style: "primary", arrow: true },
          { label: "Book a demo", href: "/demo", style: "outline" },
        ],
        people: {
          title: "People overview", period: "MAY 2026",
          stats: [
            { label: "Headcount", num: "247", sub: "+12", up: true },
            { label: "Active", num: "231", sub: "93%" },
            { label: "Onboarding", num: "7", sub: "+4", up: true },
          ],
          chart: [
            { m: "Nov", h: 46 }, { m: "Dec", h: 60 }, { m: "Jan", h: 54 }, { m: "Feb", h: 76 },
            { m: "Mar", h: 66 }, { m: "Apr", h: 88 }, { m: "May", h: 106 },
          ],
        },
      },
      mobile: {
        pill: "Trusted by 1,200+ people teams",
        headline: "The calm operating system for", accent: "people teams.",
        sub: "One workspace for everything HR — from the first offer letter to payday, beautifully connected.",
        ctas: [
          { label: "Start free trial", href: "/signup", style: "primary", arrow: true },
          { label: "Watch demo", href: "/demo", style: "watch", play: true },
        ],
      },
    },
  },
  {
    id: "moduleStrip", type: "moduleStrip", enabled: true,
    data: { label: "One workspace for the whole employee lifecycle", items: ["People", "Attendance", "Leave", "Payroll", "Approvals", "Schedules"] },
  },
  {
    id: "platform", type: "platform", enabled: true,
    data: {
      kicker: "One platform", heading: "Everything HR, in one calm place.",
      sub: "Stop stitching together five tools. NorthWeb Labs runs the whole employee lifecycle from a single, fast workspace.",
      cards: [
        { variant: "dark", icon: "people", title: "A people directory your whole company loves", text: "Profiles, roles and self-serve onboarding — with role-based access so everyone sees exactly what they should.", link: { label: "Explore People", href: "/product/people" }, href: "/product/people" },
        { variant: "light", icon: "clock", tile: "blue-tile", title: "Attendance & schedules", text: "Geo-tagged check-in, monthly grids, and weekly-off policies per employee.", href: "/product/attendance" },
        { variant: "light", icon: "calendar", tile: "green-tile", title: "Leave management", text: "Policies, balances and approvals your team can self-serve in seconds.", href: "/product/leave" },
        { variant: "light", icon: "wallet", tile: "amber-tile", title: "Payroll & payslips", text: "Generate payslips, track net pay and let employees download their own.", href: "/product/payroll" },
        { variant: "light", icon: "approvals", tile: "indigo-tile", title: "Approvals & reimbursements", text: "Leave and expense claims routed to the right approver, with email and in-app alerts.", href: "/signup" },
      ],
    },
  },
  {
    id: "speed", type: "speed", enabled: true,
    data: {
      kicker: "Built for speed", heading: "The work that took days\nnow takes minutes.",
      items: [
        { title: "Payslips in minutes", text: "Generate payslips and net pay, then approve — done." },
        { title: "Approvals that don’t pile up", text: "Leave and reimbursements routed to the right person instantly." },
        { title: "Reports leadership trusts", text: "Expense, attendance and cost views you can filter by date range." },
      ],
      cta: { label: "See it in action", href: "/demo", style: "dark", arrow: true },
      mock: {
        appTitle: "Dashboard", greeting: "Good morning, Ananya",
        payLabel: "Net pay · June", payAmount: "₹1,84,200",
        bars: [8, 12, 16, 13, 18, 22, 19, 30],
        daysNum: "14", pips: [1, 1, 1, 1, 0, 0, 0],
        todayLabel: "Today", statusText: "Checked in", timeRange: "09:02 → 18:30",
        chip1: "Payslip · ready", chip2Title: "Leave approved", chip2Sub: "2 days · Aug",
      },
    },
  },
  {
    id: "stats", type: "stats", enabled: true,
    data: {
      items: [
        { num: "6", label: "roles · owner to employee" },
        { num: "Geo", label: "location-tagged check-in" },
        { num: "1", label: "workspace for HR ops" },
        { num: "100%", label: "self-serve for employees" },
      ],
    },
  },
  {
    id: "ctaBanner", type: "ctaBanner", enabled: true,
    data: {
      heading: "Give your people team their time back.",
      text: "Start free in minutes. No credit card, no setup headache — add your team and go.",
      ctas: [
        { label: "Start free", href: "/signup", style: "white", arrow: true },
        { label: "Talk to sales", href: "/contact", style: "ghost" },
      ],
    },
  },
];