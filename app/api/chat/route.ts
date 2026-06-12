// Route: app/api/chat/route.ts
// Interactive HR chatbot — performs actions, fetches reports, generates charts
// NO API key needed — completely free
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function getSB(req: NextRequest) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get: (n) => req.cookies.get(n)?.value, set: () => {}, remove: () => {} },
  });
}

// ═══ KNOWLEDGE BASE ═══
const KB: { patterns: string[]; response: string; category?: string }[] = [
  // ── SALARY & COMPENSATION ──
  { patterns: ["pf","provident fund","epf","pf contribution","pf calculate"], category: "salary",
    response: "📋 PF (Provident Fund):\n\n• Employee: 12% of Basic Salary\n• Employer: 12% of Basic (3.67% EPF + 8.33% EPS)\n• Mandatory when Basic ≤ ₹15,000/month\n• Above ₹15,000 — voluntary\n• Admin charges: 0.5% of Basic\n• EDLI: 0.5% of Basic\n\nMax PF wage ceiling: ₹15,000/month\nMax employee PF: ₹1,800/month" },
  { patterns: ["esic","esi","esic eligibility","esic calculate"], category: "salary",
    response: "🏥 ESIC (Employee State Insurance):\n\n• Applicable: Gross Salary ≤ ₹21,000/month\n• Employee: 0.75% of Gross\n• Employer: 3.25% of Gross\n• Benefits: Medical, sickness, maternity, disability, death\n• Contribution period: April-Sept, Oct-March\n• Once covered, remains covered for full period even if salary crosses ₹21K" },
  { patterns: ["professional tax","pt","pt slab","pt rate"], category: "salary",
    response: "💼 Professional Tax (by state):\n\nMaharashtra: ₹200/mo (salary >₹10K)\nKarnataka: ₹200/mo (salary >₹15K)\nWest Bengal: ₹150/mo (₹10K-₹15K), ₹200/mo (>₹15K)\nTelangana: ₹200/mo (salary >₹20K)\nAndhra Pradesh: ₹200/mo (salary >₹20K)\nDelhi: No PT\n\nMax across India: ₹2,500/year" },
  { patterns: ["tds","tax deduction","income tax","tax slab","tax calculate"], category: "salary",
    response: "📊 TDS / Income Tax Slabs (FY 2025-26):\n\nNew Regime (default):\n• ₹0-3L: Nil\n• ₹3L-7L: 5%\n• ₹7L-10L: 10%\n• ₹10L-12L: 15%\n• ₹12L-15L: 20%\n• >₹15L: 30%\n\nOld Regime:\n• ₹0-2.5L: Nil\n• ₹2.5L-5L: 5%\n• ₹5L-10L: 20%\n• >₹10L: 30%\n\nStandard deduction: ₹75,000 (new), ₹50,000 (old)" },
  { patterns: ["ctc","ctc breakdown","cost to company","salary structure","salary breakup","ctc calculate"], category: "salary",
    response: "💰 CTC Breakdown (typical):\n\nCTC = Gross + Employer PF + Employer ESIC + Gratuity + Bonus\n\n• Basic: 40-50% of CTC\n• HRA: 40-50% of Basic\n• Special Allowance: Balance\n• Employer PF: 12% of Basic\n• Gratuity: 4.81% of Basic\n\nGross = Basic + HRA + Allowances\nNet = Gross - Employee PF - ESIC - PT - TDS\n\n📌 Example: CTC ₹10L\nBasic: ₹4,16,667 | HRA: ₹2,08,333 | Special: ₹1,75,000\nPF: ₹50,000 | Gratuity: ₹20,000 | Net: ~₹7.5L" },
  { patterns: ["hra","hra exemption","hra calculation","house rent"], category: "salary",
    response: "🏠 HRA Exemption:\n\nExempt amount = Minimum of:\n1. Actual HRA received\n2. 50% of Basic (metro) or 40% (non-metro)\n3. Rent paid - 10% of Basic\n\nMetro cities: Delhi, Mumbai, Kolkata, Chennai\n\nExample: Basic ₹40K, HRA ₹20K, Rent ₹15K (Mumbai)\n• 50% of Basic = ₹20K\n• Rent - 10% = ₹15K - ₹4K = ₹11K\n• Exempt: ₹11K (minimum)" },
  { patterns: ["bonus","statutory bonus","bonus calculate"], category: "salary",
    response: "🎁 Statutory Bonus:\n\n• Applicable: Salary/wages ≤ ₹21,000/month\n• Minimum: 8.33% of Basic\n• Maximum: 20% of Basic\n• Calculation ceiling: ₹7,000/month\n• Applicable to: Employees who worked 30+ days\n• Payment: Within 8 months of closing of accounting year" },
  { patterns: ["gratuity","gratuity calculate","gratuity rules","gratuity formula"], category: "salary",
    response: "🏆 Gratuity:\n\n• Eligible: 5+ years continuous service\n• Formula: (15 × Last Basic × Years) / 26\n• Max: ₹20,00,000 (tax-free)\n• Paid on: Resignation, retirement, death, disability\n\nExample: Basic ₹50K, 8 years\n= (15 × 50,000 × 8) / 26 = ₹2,30,769\n\n⚡ Death/disability: No 5-year requirement" },
  { patterns: ["increment","appraisal","salary hike","pay raise","salary revision"], category: "salary",
    response: "📈 Salary Increments:\n\n• Typical cycle: Annual (April or January)\n• Average India: 8-10% (IT), 6-8% (Manufacturing)\n• High performers: 15-25%\n• Promotion: 20-30% hike typical\n\nProcess:\n1. Manager reviews performance\n2. HR recommends budget\n3. Leadership approves\n4. New salary effective from increment date\n5. Update in Employees → Edit → Salary" },

  // ── LEAVE POLICIES ──
  { patterns: ["leave policy","leave types","leave rules","annual leave","leave entitlement"], category: "leave",
    response: "📋 Standard Leave Policy (India):\n\nStatutory:\n• Earned Leave: 1 day per 20 worked (≈15/year)\n• Casual Leave: 12 days/year\n• Sick Leave: 12 days/year\n\nSpecial:\n• Maternity: 26 weeks (first 2 children), 12 weeks (3rd+)\n• Paternity: 15 days\n• Bereavement: 3-5 days\n• Marriage: 3-5 days (company policy)\n• Comp Off: Against extra working days\n\n📌 Shops & Establishments Act varies by state" },
  { patterns: ["casual leave","cl"], category: "leave", response: "☕ Casual Leave:\n• 12 days/year typically\n• Cannot carry forward (lapses Dec 31)\n• Max 3 consecutive days\n• Not encashable\n• For personal/unforeseen matters\n• Apply in advance when possible" },
  { patterns: ["sick leave","sl","medical leave"], category: "leave", response: "🏥 Sick Leave:\n• 12 days/year typically\n• Medical certificate required for 3+ consecutive days\n• Some companies allow carry forward\n• Can be half-day\n• Misuse may lead to disciplinary action" },
  { patterns: ["earned leave","el","privilege leave","pl"], category: "leave", response: "📅 Earned/Privilege Leave:\n• 15 days/year (1 per 20 worked days)\n• Can carry forward (max 30-45 days)\n• Encashable on separation\n• Apply 15 days in advance\n• Sandwich rule: Weekends between leaves counted" },
  { patterns: ["maternity","maternity leave","maternity benefit"], category: "leave", response: "🤱 Maternity Leave:\n• 26 weeks for first 2 children\n• 12 weeks for 3rd child onwards\n• 12 weeks for adoption/surrogacy\n• Paid at average daily wage\n• Cannot terminate during maternity\n• Work from home option available post-leave" },
  { patterns: ["paternity","paternity leave"], category: "leave", response: "👨‍👧 Paternity Leave:\n• 15 days (central govt employees)\n• Private sector: Company policy (typically 5-15 days)\n• Within 6 months of child's birth\n• Paid leave\n• Also applicable for adoption" },
  { patterns: ["comp off","compensatory off","compensatory leave"], category: "leave", response: "🔄 Comp Off:\n• Earned by working on holidays/weekends\n• Must be availed within 30-60 days\n• Requires manager approval\n• Cannot be encashed usually\n• Apply via Approvals → Raise Request" },
  { patterns: ["apply leave","how to apply leave","request leave"], category: "leave",
    response: "📝 To apply for leave:\n\n1. My Dashboard → Click 'Apply Leave'\n2. Select type (Casual/Sick/Earned/WFH/Comp Off)\n3. Pick From and To dates\n4. Add reason (optional)\n5. Submit → Manager gets notified instantly\n\nTrack status in Approvals → Sent tab\n\n💡 Tip: Apply earned leave 15 days in advance" },
  { patterns: ["leave balance","remaining leave","leave left"], category: "leave",
    response: "📊 Check your leave balance:\n\nGo to My Dashboard → Right panel → 'Leave balance'\nShows: Casual, Sick, Earned with progress bars\n\nOr say 'show my leave balance' and I'll fetch it for you!" },
  { patterns: ["leave encashment","encash leave"], category: "leave", response: "💵 Leave Encashment:\n• Only Earned Leave (EL/PL) is encashable\n• On separation: All accumulated EL\n• During service: Company policy (some allow annual)\n• Formula: (Basic + DA) / 30 × Number of days\n• Tax: Exempt up to ₹25,00,000 (as per Budget 2023)" },

  // ── ATTENDANCE ──
  { patterns: ["mark attendance","check in","punch in","clock in"], category: "action",
    response: "⏰ I can mark your attendance! Just say:\n• 'check in' or 'mark attendance'\n• 'check out' when done\n\nOr do it from My Dashboard → Check In Now button\n\nWhatsApp: Send 'IN' to mark check-in" },
  { patterns: ["attendance report","attendance summary","my attendance"], category: "report",
    response: "📊 I'll fetch your attendance report. Say:\n• 'show my attendance' for this month\n• 'attendance report' for detailed view\n\nOr go to Attendance page for full history with calendar view." },
  { patterns: ["late coming","late mark","late policy"], category: "attendance",
    response: "⏰ Late Coming Policy:\n• Grace period: 15-30 minutes (company policy)\n• 3 late marks = 1 half-day deduction (typical)\n• Repeated late: Warning letter → Salary deduction\n• Track in Attendance → Late Report\n\nConfigure grace period in Settings → Attendance" },
  { patterns: ["work from home","wfh","remote work","hybrid"], category: "attendance",
    response: "🏠 Work From Home:\n• Apply via Leave → WFH option\n• Or mark attendance as 'WFH' source\n• Requires manager approval (configurable)\n• Hybrid: Define office days in Settings\n• WFH attendance tracked same as office" },
  { patterns: ["overtime","ot","overtime calculate","extra hours"], category: "attendance",
    response: "⏳ Overtime:\n• Rate: 2× normal hourly rate (Factories Act)\n• Max OT: 50 hours/quarter\n• Calculate: (Basic + DA) / (26 × 8) × 2 × OT hours\n• Requires manager approval\n• Track in Attendance → Overtime Report" },

  // ── COMPLIANCE & LEGAL ──
  { patterns: ["labour law","labor law","factories act","shops act"], category: "compliance",
    response: "⚖️ Key Labour Laws:\n\n• Shops & Establishments Act: Working hours, holidays, leave\n• Factories Act 1948: Safety, welfare, overtime\n• Payment of Wages Act: Timely salary, deductions\n• Minimum Wages Act: State-wise minimum rates\n• Payment of Bonus Act: 8.33-20% bonus\n• Payment of Gratuity Act: 5-year gratuity\n• Maternity Benefit Act: 26 weeks leave\n• POSH Act: Anti-harassment policy mandatory\n\n4 new Labour Codes (being implemented):\n1. Code on Wages\n2. Code on Social Security\n3. Code on Industrial Relations\n4. Code on OSH" },
  { patterns: ["posh","sexual harassment","harassment policy","icc"], category: "compliance",
    response: "🛡️ POSH (Prevention of Sexual Harassment):\n\n• Mandatory for 10+ employees\n• Must have Internal Complaints Committee (ICC)\n• Annual training required\n• File annual return to District Officer\n• Complaint resolution: 90 days\n• Penalty: Up to ₹50,000 for non-compliance" },
  { patterns: ["minimum wage","minimum salary"], category: "compliance",
    response: "💰 Minimum Wages (2025, approximate):\n\nMaharashtra: ₹12,500-14,000/mo\nDelhi: ₹17,494-20,903/mo\nKarnataka: ₹10,000-13,500/mo\nTamil Nadu: ₹8,000-12,000/mo\nTelangana: ₹9,000-13,000/mo\nWest Bengal: ₹9,000-11,000/mo\n\n⚠️ Rates vary by skill level (unskilled/semi/skilled)\nRevised periodically — check state Labour Dept" },
  { patterns: ["notice period","resignation","resign","fnf","full and final","exit","separation"], category: "compliance",
    response: "📤 Exit / F&F Process:\n\n1. Employee submits resignation\n2. Notice period: 30-90 days (per contract)\n3. Notice buyout option available\n4. Manager acknowledges → HR processes\n5. Knowledge transfer & handover\n6. Full & Final settlement (within 30 days):\n   • Pending salary\n   • Leave encashment\n   • Bonus (pro-rata)\n   • Gratuity (if 5+ years)\n   • PF settlement\n   • Minus: Notice shortfall, loan recovery\n\nManage in Offboarding page" },
  { patterns: ["probation","confirmation","probation period"], category: "compliance",
    response: "📋 Probation Period:\n• Typical: 3-6 months\n• Can be extended once (usually)\n• Notice period during probation: 7-15 days\n• No gratuity/bonus during probation\n• Confirmation letter issued after completion\n\nGenerate confirmation letter in HR Letters page" },
  { patterns: ["contract","contract employee","fixed term"], category: "compliance",
    response: "📄 Contract Employment:\n• Fixed-term contract: Same benefits as permanent\n• Must specify end date\n• Gratuity: If served 1+ year on fixed-term\n• Cannot be treated as 'contractor' for benefits evasion\n• Renewal: New contract needed, no auto-extension" },
  { patterns: ["gst","gst invoice","gst rate"], category: "compliance",
    response: "🧾 GST for Services:\n• 18% on most professional services\n• Registration: Mandatory if turnover > ₹20L (₹10L NE states)\n• Quarterly filing for <₹5Cr turnover\n• Monthly filing for >₹5Cr\n\nPayroll is exempt from GST\nHR consulting services: 18% GST" },

  // ── ONBOARDING ──
  { patterns: ["onboard","onboarding","add employee","new employee","new hire","how to add employee"], category: "action",
    response: "👤 Onboard a new employee:\n\n1. Employees page → 'Onboard Employee'\n2. Step 1: Name, phone, email, DOB, gender\n3. Step 2: Department, designation, reporting manager, role, salary\n4. Step 3: PAN, Aadhaar, bank details, PF/ESIC\n5. Click 'Complete Onboarding'\n\nSystem auto-generates:\n• Employee code (EMP001, EMP002...)\n• Self-onboarding link\n• User login account\n\n💡 Say 'onboard employee' and I'll guide you step by step!" },
  { patterns: ["self onboard","self onboarding","onboarding link","invite employee"], category: "onboarding",
    response: "🔗 Self-Onboarding:\n• Generated automatically when you add an employee\n• Link format: /onboard/self?org=xxx&email=yyy\n• Employee fills remaining details themselves\n• Copy link from Employee Profile → Onboarding Link\n• Can re-send via email anytime\n\nAlternative: Settings → Invite → Send email invite" },
  { patterns: ["document checklist","joining documents","documents required"], category: "onboarding",
    response: "📎 Joining Document Checklist:\n\n✅ Identity: Aadhaar, PAN, Passport\n✅ Education: Degree certificates, marksheets\n✅ Employment: Offer letter, experience letters, relieving letter\n✅ Salary: Last 3 months payslips, Form 16\n✅ Bank: Cancelled cheque / passbook\n✅ Photos: 2 passport size\n✅ Medical: Fitness certificate (if applicable)\n✅ References: 2 professional references" },

  // ── PAYROLL ──
  { patterns: ["payroll","run payroll","process payroll","salary process","generate payslip"], category: "action",
    response: "💰 Payroll Process:\n\n1. Payroll page → Select month\n2. Ensure attendance is finalized\n3. System calculates for each employee:\n   • Gross = Basic + HRA + Allowances\n   • Deductions = PF + ESIC + PT + TDS + LOP\n4. Review & adjust if needed\n5. Click 'Process Payroll'\n6. Generate PDF payslips\n7. Send via email/WhatsApp\n\n📊 Say 'payroll summary' to see this month's overview!" },
  { patterns: ["payslip","salary slip","pay stub"], category: "payroll",
    response: "📄 Payslip Details:\n\nEarnings: Basic, HRA, Special Allowance, Other\nDeductions: PF, ESIC, PT, TDS, LOP\nNet = Gross - Total Deductions\n\nView in: My Dashboard → Latest Payslip\nOr: Payroll → Employee → Download PDF\n\n💡 Employees can view their own payslips from My Dashboard" },
  { patterns: ["lop","loss of pay","leave without pay","lwp"], category: "payroll",
    response: "📉 Loss of Pay (LOP):\n• Deducted when leave balance is zero\n• Formula: (Gross Salary / Total Working Days) × LOP Days\n• Affects PF (if Basic changes), ESIC, Bonus calculations\n• Reflected in payslip under deductions\n• Track in Attendance → Absence Report" },

  // ── APPROVALS ──
  { patterns: ["approval","approve","pending approval","approval flow","workflow"], category: "action",
    response: "✅ Approval Workflow:\n\n1. Employee raises request (leave/expense/asset/custom)\n2. Auto-assigned to reporting manager\n3. Manager gets notification 🔔\n4. 24-hour TAT (turnaround time)\n5. If no action → auto-escalates to next level\n6. Manager approves/rejects with remarks\n7. Employee notified of decision\n\nView: Sidebar → Approvals\n• Inbox: Requests assigned to you\n• Sent: Your submitted requests\n• All: Everything in your org" },
  { patterns: ["expense claim","reimbursement","expense report"], category: "action",
    response: "💳 Expense Reimbursement:\n\n1. Approvals → Raise Request → Expense\n2. Enter: Amount, Category, Description\n3. Categories: Travel, Food, Accommodation, Software, Medical, Phone, Client Entertainment\n4. Submit → Goes to manager\n5. Approved → Finance processes payment\n\nCategories with limits:\n• Travel: Actuals with bills\n• Food: ₹500/day (typical)\n• Phone: ₹1,000/month (typical)" },

  // ── HR LETTERS ──
  { patterns: ["offer letter","draft offer","write offer"], category: "letters",
    response: "📝 Generate Offer Letter:\n\n1. HR Letters → Select 'Offer Letter'\n2. Fill: Candidate name, designation, department, CTC\n3. Set: Joining date, reporting manager, probation period\n4. Preview on right panel\n5. Download PDF or email directly\n\nTemplate includes: CTC breakdown, terms, company details\n\n💡 Use CTC Calculator in Letters page for salary split" },
  { patterns: ["experience letter","relieving letter","service certificate"], category: "letters",
    response: "📜 Experience/Relieving Letter:\n\n1. HR Letters → Select template\n2. Pick employee from dropdown\n3. Fields auto-fill: Name, designation, DOJ, last working day\n4. Preview → Download\n\nExperience Letter: Confirms employment period + role\nRelieving Letter: Confirms resignation accepted + dues cleared" },
  { patterns: ["warning letter","show cause","disciplinary"], category: "letters",
    response: "⚠️ Warning Letter:\n\n1. HR Letters → Select 'Warning Letter'\n2. Fill: Employee name, reason, date of incident\n3. Specify: Expected improvement, timeline\n4. Preview → Download → Get signed\n\nProgressive discipline:\n1st: Verbal warning\n2nd: Written warning\n3rd: Final warning\n4th: Termination" },
  { patterns: ["appointment letter","joining letter"], category: "letters",
    response: "📋 Appointment Letter:\n\n1. HR Letters → Select 'Appointment Letter'\n2. Fill: Name, designation, CTC, joining date\n3. Includes: Terms of employment, probation, notice period, confidentiality\n4. Preview with CTC breakdown\n5. Download → Send to employee before joining\n\nLegally required before first day of work" },

  // ── REPORTS ──
  { patterns: ["report","reports","analytics","dashboard report","hr report"], category: "report",
    response: "📊 Available Reports:\n\n• Attendance Report: Daily/monthly presence\n• Leave Report: Balance, usage, trends\n• Payroll Report: Monthly salary summary\n• Employee Report: Headcount, demographics\n• Compliance Report: PF/ESIC filing status\n• Turnover Report: Exits, retention rate\n\nGo to Reports page or say 'show attendance report'" },
  { patterns: ["headcount","employee count","how many employees","team size"], category: "report",
    response: "📊 I can show you the current headcount! Say 'show employee report' and I'll fetch live data from the database." },
  { patterns: ["turnover","attrition","retention","exit rate"], category: "report",
    response: "📉 Turnover/Attrition:\n\n• Formula: (Exits in period / Avg headcount) × 100\n• India IT average: 15-20% annually\n• Good: <10%, Concerning: >25%\n• Track in Reports → Turnover\n\nReduce attrition:\n• Competitive pay, Career growth\n• Good manager relationships\n• Work-life balance, Recognition" },

  // ── SETTINGS & SETUP ──
  { patterns: ["settings","configure","setup","organization setup"], category: "settings",
    response: "⚙️ Organization Setup:\n\n1. Settings → Organization: Name, GSTIN, PAN, address\n2. Settings → Team: View/edit user roles\n3. Settings → Invite: Add team members\n4. Settings → Roles: See permission matrix\n5. Settings → Branding: Logo, brand color\n6. Settings → Billing: Plan & subscription\n\n💡 Only Owner/Admin can access all settings" },
  { patterns: ["department","create department","add department"], category: "settings",
    response: "🏢 Create Department:\n\n1. Employees page → 'New Dept' button\n2. Enter department name\n3. Optionally assign a department head\n4. Department appears in employee onboarding dropdown\n\nOr create during employee onboarding → Step 2 → '+' button next to Department" },
  { patterns: ["role","roles","permission","access control","who can"], category: "settings",
    response: "🔐 Role Permissions:\n\n👑 Owner: Everything + billing + delete org\n🔑 Admin: Everything except billing\n📋 HR: Employees, payroll, attendance, leaves, letters\n👤 Manager: Team view, approve requests\n👤 Employee: Self-service only\n\nChange roles in Settings → Team → Click on role badge" },

  // ── GREETINGS & META ──
  { patterns: ["hello","hi","hey","good morning","good afternoon","good evening","sup","yo"], category: "greeting",
    response: "👋 Hello! I'm NorthBot, your HRMS assistant.\n\nI can help you with:\n• 💰 Salary calculations (CTC, PF, TDS)\n• 📋 Leave policies & applications\n• 👥 Employee onboarding\n• ✅ Approvals & workflows\n• 📊 Reports & analytics\n• 📄 HR letter generation\n• ⚖️ Compliance & legal\n\nI can also perform actions:\n• ⏰ 'Check in' — Mark attendance\n• 📝 'Apply leave' — Start leave application\n• 📊 'Show report' — Fetch live data\n\nWhat would you like help with?" },
  { patterns: ["thank","thanks","thank you","thx","ty"], category: "greeting", response: "You're welcome! 😊 Let me know if you need anything else." },
  { patterns: ["bye","goodbye","see you","cya"], category: "greeting", response: "Goodbye! Have a great day! 👋 I'm always here if you need help." },
  { patterns: ["who are you","what are you","about","your name"], category: "greeting",
    response: "I'm NorthBot 🤖 — the AI assistant built into NorthWebLabs HRMS.\n\nI can answer HR questions, perform actions (mark attendance, apply leave), and generate reports with charts — all from this chat!\n\nNo API key needed, I work completely free. Built with ❤️ for Indian businesses." },
  { patterns: ["help","what can you do","features","menu","commands"], category: "greeting",
    response: "🔥 Everything I can do:\n\n📚 Knowledge:\n• Salary (CTC, PF, ESIC, TDS, HRA, Gratuity)\n• Leave (types, policies, encashment)\n• Compliance (labour laws, POSH, minimum wages)\n• Letters (offer, appointment, experience, warning)\n\n⚡ Actions:\n• 'check in' — Mark today's attendance\n• 'apply leave' — Start leave application\n• 'onboard employee' — Step-by-step guide\n\n📊 Reports:\n• 'show employees' — Employee summary + chart\n• 'show attendance' — This month's stats\n• 'show leaves' — Leave overview\n• 'show approvals' — Pending requests\n\n🧮 Calculators:\n• 'calculate pf 50000' — PF on ₹50K basic\n• 'calculate ctc 1200000' — CTC breakdown\n• 'calculate gratuity 50000 8' — Gratuity calc" },
  { patterns: ["joke","funny","tell me a joke"], category: "greeting", response: "😄 Why did the HR manager bring a ladder to work?\n\nBecause they wanted to reach the next level of employee engagement! 🪜\n\n...I'll stick to HR queries. 😅" },
];

// ═══ CALCULATORS ═══
function calculatePF(basic: number) {
  const empPF = Math.min(basic * 0.12, 1800);
  const empPFPercent = ((empPF / basic) * 100).toFixed(1);
  const empEPS = Math.min(basic * 0.0833, 1250);
  const empEPF = empPF - empEPS;
  return `🧮 PF Calculation for Basic ₹${basic.toLocaleString("en-IN")}:\n\nEmployee PF: ₹${empPF.toLocaleString("en-IN")} (12%)\nEmployer EPF: ₹${empEPF.toLocaleString("en-IN")} (3.67%)\nEmployer EPS: ₹${empEPS.toLocaleString("en-IN")} (8.33%)\nAdmin charges: ₹${Math.round(basic * 0.005).toLocaleString("en-IN")} (0.5%)\n\nTotal cost to employer: ₹${Math.round(empPF + basic * 0.005).toLocaleString("en-IN")}/month`;
}

function calculateCTC(annual: number) {
  const monthly = annual / 12;
  const basic = Math.round(annual * 0.42 / 12);
  const hra = Math.round(basic * 0.5);
  const pf = Math.round(Math.min(basic * 0.12, 1800));
  const gratuity = Math.round(basic * 0.0481);
  const special = Math.round(monthly - basic - hra - pf - gratuity);
  const gross = basic + hra + special;
  const pt = 200;
  const net = gross - pf - pt;
  return { basic, hra, special, pf, gratuity, gross, net, pt, text:
    `💰 CTC Breakdown for ₹${(annual/100000).toFixed(1)}L/year:\n\n📥 Earnings (Monthly):\nBasic: ₹${basic.toLocaleString("en-IN")}\nHRA: ₹${hra.toLocaleString("en-IN")}\nSpecial Allowance: ₹${special.toLocaleString("en-IN")}\nGross: ₹${gross.toLocaleString("en-IN")}\n\n📤 Deductions:\nEmployee PF: ₹${pf.toLocaleString("en-IN")}\nProfessional Tax: ₹${pt}\n\n💵 Net Take-Home: ₹${net.toLocaleString("en-IN")}/month\nAnnual Net: ₹${(net*12).toLocaleString("en-IN")}` };
}

function calculateGratuity(basic: number, years: number) {
  const amount = Math.round((15 * basic * years) / 26);
  const capped = Math.min(amount, 2000000);
  return `🏆 Gratuity Calculation:\n\nBasic: ₹${basic.toLocaleString("en-IN")}/month\nYears: ${years}\nFormula: (15 × ${basic.toLocaleString("en-IN")} × ${years}) / 26\n\nGratuity: ₹${amount.toLocaleString("en-IN")}${amount > 2000000 ? ` (capped at ₹20,00,000)` : ""}\n\n${years < 5 ? "⚠️ Note: Minimum 5 years service required for eligibility" : "✅ Eligible (5+ years)"}`;
}

// ═══ MAIN HANDLER ═══
function findAnswer(query: string): { text: string; type?: string; data?: any } {
  const q = query.toLowerCase().trim();

  // ── CALCULATORS ──
  const pfMatch = q.match(/(?:calculate|calc)\s*pf\s*(\d+)/);
  if (pfMatch) return { text: calculatePF(parseInt(pfMatch[1])), type: "text" };

  const ctcMatch = q.match(/(?:calculate|calc)\s*ctc\s*(\d+)/);
  if (ctcMatch) {
    const r = calculateCTC(parseInt(ctcMatch[1]));
    return { text: r.text, type: "chart", data: { type: "ctc", labels: ["Basic","HRA","Special","PF","Gratuity","PT"], values: [r.basic, r.hra, r.special, r.pf, r.gratuity, r.pt], colors: ["#6366F1","#22C55E","#F59E0B","#EF4444","#8B5CF6","#EC4899"] } };
  }

  const gratMatch = q.match(/(?:calculate|calc)\s*gratuity\s*(\d+)\s*(\d+)/);
  if (gratMatch) return { text: calculateGratuity(parseInt(gratMatch[1]), parseInt(gratMatch[2])), type: "text" };

  // ── ACTIONS (return special types) ──
  if (/^(check\s*in|punch\s*in|mark\s*(my\s*)?attendance|i.m here|start work)/i.test(q)) {
    return { text: "⏰ Marking your attendance...", type: "action", data: { action: "checkin" } };
  }
  if (/^(check\s*out|punch\s*out|log\s*out attendance|end work|done for)/i.test(q)) {
    return { text: "⏰ Marking check-out...", type: "action", data: { action: "checkout" } };
  }

  // ── REPORTS (return chart data) ──
  if (/show\s*(my\s*)?employee|employee\s*(report|summary|list|count|stats)/i.test(q)) {
    return { text: "📊 Fetching employee data...", type: "report", data: { report: "employees" } };
  }
  if (/show\s*(my\s*)?attendance|attendance\s*(report|summary|stats)/i.test(q)) {
    return { text: "📊 Fetching attendance data...", type: "report", data: { report: "attendance" } };
  }
  if (/show\s*(my\s*)?leave|leave\s*(report|summary|balance|stats)/i.test(q)) {
    return { text: "📊 Fetching leave data...", type: "report", data: { report: "leaves" } };
  }
  if (/show\s*(my\s*)?(approval|pending)|approval\s*(report|summary)/i.test(q)) {
    return { text: "📊 Fetching approvals...", type: "report", data: { report: "approvals" } };
  }
  if (/show\s*(department|dept)\s*(breakdown|report|chart|split)/i.test(q)) {
    return { text: "📊 Fetching department data...", type: "report", data: { report: "departments" } };
  }

  // ── KB SEARCH ──
  let best = { score: 0, response: "", category: "" };
  for (const entry of KB) {
    let score = 0;
    for (const pattern of entry.patterns) {
      if (q.includes(pattern)) score += pattern.length * 2;
      for (const word of q.split(/\s+/)) {
        if (word.length > 2 && pattern.includes(word)) score += 1;
      }
    }
    if (score > best.score) best = { score, response: entry.response, category: entry.category || "" };
  }

  if (best.score > 0) return { text: best.response, type: "text" };

  return { text: "🤔 I'm not sure about that. Here are things I can help with:\n\n💰 Salary: 'calculate ctc 1200000', 'pf rules'\n📋 Leave: 'apply leave', 'leave policy'\n⏰ Actions: 'check in', 'show employees'\n📊 Reports: 'show attendance', 'show departments'\n📄 Letters: 'offer letter', 'warning letter'\n⚖️ Legal: 'labour laws', 'notice period'\n🧮 Calculate: 'calc pf 50000', 'calc gratuity 40000 7'\n\nTry one of these!", type: "text" };
}

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();
    if (!messages?.length) return NextResponse.json({ content: "How can I help?" });

    const lastMsg = messages.filter((m: any) => m.role === "user").pop();
    if (!lastMsg) return NextResponse.json({ content: "Type a question!" });

    const result = findAnswer(lastMsg.content);
    const sb = getSB(req);
    const orgId = context?.orgId || "";
    const email = context?.email || "";

    // ── HANDLE ACTIONS ──
    if (result.type === "action" && result.data?.action === "checkin" && orgId && email) {
      const { data: emp } = await sb.from("employees").select("id").eq("email", email).eq("org_id", orgId).maybeSingle();
      if (emp) {
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await sb.from("attendance").select("id").eq("employee_id", emp.id).eq("date", today).maybeSingle();
        if (existing) {
          return NextResponse.json({ content: "✅ You're already checked in today! Have a productive day." });
        }
        await sb.from("attendance").insert({ employee_id: emp.id, org_id: orgId, date: today, check_in: new Date().toISOString(), status: "present", source: "chatbot" });
        const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
        return NextResponse.json({ content: `✅ Checked in at ${time}! Have a great day. 🚀` });
      }
      return NextResponse.json({ content: "⚠️ Could not find your employee record. Please check in from My Dashboard instead." });
    }

    // ── HANDLE REPORTS ──
    if (result.type === "report" && orgId) {
      if (result.data.report === "employees") {
        const { data: emps } = await sb.from("employees").select("id, full_name, department, designation, role, status").eq("org_id", orgId).eq("status", "active");
        const list = emps || [];
        const deptMap: Record<string, number> = {};
        list.forEach(e => { deptMap[e.department || "Unassigned"] = (deptMap[e.department || "Unassigned"] || 0) + 1; });
        const labels = Object.keys(deptMap); const values = Object.values(deptMap);
        const roleMap: Record<string, number> = {};
        list.forEach(e => { roleMap[e.role || "employee"] = (roleMap[e.role || "employee"] || 0) + 1; });
        return NextResponse.json({ content: `👥 Employee Summary:\n\nTotal active: ${list.length}\n${labels.map((l,i) => `• ${l}: ${values[i]}`).join("\n")}\n\nBy role:\n${Object.entries(roleMap).map(([r,c]) => `• ${r}: ${c}`).join("\n")}`,
          chart: { type: "pie", title: "Department Breakdown", labels, values, colors: ["#6366F1","#22C55E","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#F97316"] } });
      }
      if (result.data.report === "attendance") {
        const today = new Date().toISOString().split("T")[0];
        const monthStart = today.slice(0, 8) + "01";
        const { data: emps } = await sb.from("employees").select("id").eq("org_id", orgId).eq("status", "active");
        const { data: att } = await sb.from("attendance").select("status, date").eq("org_id", orgId).gte("date", monthStart).lte("date", today);
        const total = emps?.length || 0;
        const todayAtt = (att || []).filter(a => a.date === today);
        const present = todayAtt.filter(a => ["present","late","wfh"].includes(a.status)).length;
        const monthDays = (att || []).reduce((acc: Record<string, number>, a) => { acc[a.date] = (acc[a.date] || 0) + 1; return acc; }, {});
        const dates = Object.keys(monthDays).sort().slice(-7);
        return NextResponse.json({ content: `📊 Attendance Summary:\n\nToday: ${present}/${total} present (${total > 0 ? Math.round(present/total*100) : 0}%)\nAbsent today: ${total - present}\nMonth records: ${(att || []).length} entries`,
          chart: { type: "bar", title: "Last 7 Days Attendance", labels: dates.map(d => d.slice(5)), values: dates.map(d => monthDays[d] || 0), colors: ["#22C55E"] } });
      }
      if (result.data.report === "departments") {
        const { data: emps } = await sb.from("employees").select("department").eq("org_id", orgId).eq("status", "active");
        const deptMap: Record<string, number> = {};
        (emps || []).forEach(e => { deptMap[e.department || "Unassigned"] = (deptMap[e.department || "Unassigned"] || 0) + 1; });
        return NextResponse.json({ content: `🏢 Department Breakdown:\n\n${Object.entries(deptMap).map(([d,c]) => `• ${d}: ${c} employees`).join("\n")}\n\nTotal: ${(emps || []).length}`,
          chart: { type: "donut", title: "Department Split", labels: Object.keys(deptMap), values: Object.values(deptMap), colors: ["#6366F1","#22C55E","#F59E0B","#EF4444","#8B5CF6","#EC4899"] } });
      }
      if (result.data.report === "approvals") {
        const { data: reqs } = await sb.from("approval_requests").select("status, type").eq("org_id", orgId);
        const pending = (reqs || []).filter(r => r.status === "pending").length;
        const approved = (reqs || []).filter(r => r.status === "approved").length;
        const rejected = (reqs || []).filter(r => r.status === "rejected").length;
        return NextResponse.json({ content: `✅ Approval Summary:\n\n• Pending: ${pending}\n• Approved: ${approved}\n• Rejected: ${rejected}\n• Total: ${(reqs || []).length}`,
          chart: { type: "pie", title: "Approval Status", labels: ["Pending","Approved","Rejected"], values: [pending, approved, rejected], colors: ["#F59E0B","#22C55E","#EF4444"] } });
      }
      if (result.data.report === "leaves") {
        const { data: leaves } = await sb.from("leaves").select("status, leave_type").eq("org_id", orgId);
        const pending = (leaves || []).filter(l => l.status === "pending").length;
        const approved = (leaves || []).filter(l => l.status === "approved").length;
        return NextResponse.json({ content: `📋 Leave Summary:\n\n• Pending: ${pending}\n• Approved: ${approved}\n• Total requests: ${(leaves || []).length}`,
          chart: { type: "bar", title: "Leave Requests", labels: ["Pending","Approved","Rejected"], values: [pending, approved, (leaves || []).length - pending - approved], colors: ["#F59E0B","#22C55E","#EF4444"] } });
      }
    }

    // ── CTC CHART ──
    if (result.type === "chart") {
      return NextResponse.json({ content: result.text, chart: result.data });
    }

    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    return NextResponse.json({ content: result.text });
  } catch (err: any) {
    console.error("[chat]", err.message);
    return NextResponse.json({ content: "Something went wrong. Try again!" });
  }
}