"use client";
// Route: app/(dashboard)/settings/page.tsx

import { useState, useEffect, useMemo, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Building2, Users, Shield, Copy, CheckCircle2, AlertCircle,
  Loader2, Save, Trash2, Search, X,
  Crown, Key, Palette, CreditCard,
  Upload, UserPlus, UserMinus,
  AlertTriangle, ExternalLink, Check, ChevronDown,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }

async function resolveOrgId(sb: any): Promise<string> {
  // 1. Try localStorage
  let oid = typeof window !== "undefined" ? localStorage.getItem("activeOrgId") || "" : "";
  if (oid) return oid;
  // 2. Fallback: get from users table via email
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  if (email) {
    const { data } = await sb.from("users").select("org_id").eq("email", email).maybeSingle();
    if (data?.org_id) {
      oid = data.org_id;
      localStorage.setItem("activeOrgId", oid);
      return oid;
    }
  }
  // 3. Last resort: get first org from organizations table
  const { data: firstOrg } = await sb.from("organizations").select("id").limit(1).maybeSingle();
  if (firstOrg?.id) {
    oid = firstOrg.id;
    localStorage.setItem("activeOrgId", oid);
    return oid;
  }
  return "";
}

// ── CURRENCIES (150+) ───────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", country: "India", iso: "in" },
  { code: "USD", symbol: "$", name: "US Dollar", country: "United States", iso: "us" },
  { code: "EUR", symbol: "€", name: "Euro", country: "European Union", iso: "eu" },
  { code: "GBP", symbol: "£", name: "British Pound", country: "United Kingdom", iso: "gb" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", country: "Japan", iso: "jp" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", country: "China", iso: "cn" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", country: "Australia", iso: "au" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", country: "Canada", iso: "ca" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", country: "Switzerland", iso: "ch" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", country: "Hong Kong", iso: "hk" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", country: "Singapore", iso: "sg" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", country: "Sweden", iso: "se" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", country: "South Korea", iso: "kr" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", country: "Norway", iso: "no" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", country: "New Zealand", iso: "nz" },
  { code: "MXN", symbol: "$", name: "Mexican Peso", country: "Mexico", iso: "mx" },
  { code: "ZAR", symbol: "R", name: "South African Rand", country: "South Africa", iso: "za" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", country: "Brazil", iso: "br" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", country: "UAE", iso: "ae" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", country: "Saudi Arabia", iso: "sa" },
  { code: "THB", symbol: "฿", name: "Thai Baht", country: "Thailand", iso: "th" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar", country: "Taiwan", iso: "tw" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty", country: "Poland", iso: "pl" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", country: "Turkey", iso: "tr" },
  { code: "DKK", symbol: "kr", name: "Danish Krone", country: "Denmark", iso: "dk" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", country: "Indonesia", iso: "id" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", country: "Malaysia", iso: "my" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", country: "Philippines", iso: "ph" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna", country: "Czech Republic", iso: "cz" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint", country: "Hungary", iso: "hu" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel", country: "Israel", iso: "il" },
  { code: "CLP", symbol: "$", name: "Chilean Peso", country: "Chile", iso: "cl" },
  { code: "ARS", symbol: "$", name: "Argentine Peso", country: "Argentina", iso: "ar" },
  { code: "COP", symbol: "$", name: "Colombian Peso", country: "Colombia", iso: "co" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol", country: "Peru", iso: "pe" },
  { code: "EGP", symbol: "£", name: "Egyptian Pound", country: "Egypt", iso: "eg" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", country: "Vietnam", iso: "vn" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", country: "Bangladesh", iso: "bd" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", country: "Pakistan", iso: "pk" },
  { code: "LKR", symbol: "₨", name: "Sri Lankan Rupee", country: "Sri Lanka", iso: "lk" },
  { code: "NPR", symbol: "₨", name: "Nepalese Rupee", country: "Nepal", iso: "np" },
  { code: "MMK", symbol: "K", name: "Myanmar Kyat", country: "Myanmar", iso: "mm" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", country: "Kuwait", iso: "kw" },
  { code: "QAR", symbol: "﷼", name: "Qatari Riyal", country: "Qatar", iso: "qa" },
  { code: "BHD", symbol: "BD", name: "Bahraini Dinar", country: "Bahrain", iso: "bh" },
  { code: "OMR", symbol: "﷼", name: "Omani Rial", country: "Oman", iso: "om" },
  { code: "JOD", symbol: "JD", name: "Jordanian Dinar", country: "Jordan", iso: "jo" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", country: "Nigeria", iso: "ng" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", country: "Kenya", iso: "ke" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", country: "Ghana", iso: "gh" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", country: "Tanzania", iso: "tz" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling", country: "Uganda", iso: "ug" },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham", country: "Morocco", iso: "ma" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr", country: "Ethiopia", iso: "et" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble", country: "Russia", iso: "ru" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", country: "Ukraine", iso: "ua" },
  { code: "RON", symbol: "lei", name: "Romanian Leu", country: "Romania", iso: "ro" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev", country: "Bulgaria", iso: "bg" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna", country: "Croatia", iso: "hr" },
  { code: "RSD", symbol: "din", name: "Serbian Dinar", country: "Serbia", iso: "rs" },
  { code: "ISK", symbol: "kr", name: "Icelandic Krona", country: "Iceland", iso: "is" },
  { code: "GEL", symbol: "₾", name: "Georgian Lari", country: "Georgia", iso: "ge" },
  { code: "AMD", symbol: "֏", name: "Armenian Dram", country: "Armenia", iso: "am" },
  { code: "AZN", symbol: "₼", name: "Azerbaijani Manat", country: "Azerbaijan", iso: "az" },
  { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge", country: "Kazakhstan", iso: "kz" },
  { code: "UZS", symbol: "сўм", name: "Uzbekistani Som", country: "Uzbekistan", iso: "uz" },
  { code: "AFN", symbol: "؋", name: "Afghan Afghani", country: "Afghanistan", iso: "af" },
  { code: "IRR", symbol: "﷼", name: "Iranian Rial", country: "Iran", iso: "ir" },
  { code: "IQD", symbol: "ع.د", name: "Iraqi Dinar", country: "Iraq", iso: "iq" },
  { code: "LBP", symbol: "ل.ل", name: "Lebanese Pound", country: "Lebanon", iso: "lb" },
  { code: "SYP", symbol: "£", name: "Syrian Pound", country: "Syria", iso: "sy" },
  { code: "XOF", symbol: "CFA", name: "West African CFA", country: "West Africa", iso: "sn" },
  { code: "XAF", symbol: "FCFA", name: "Central African CFA", country: "Central Africa", iso: "cm" },
  { code: "JMD", symbol: "J$", name: "Jamaican Dollar", country: "Jamaica", iso: "jm" },
  { code: "TTD", symbol: "TT$", name: "Trinidad Dollar", country: "Trinidad", iso: "tt" },
  { code: "FJD", symbol: "FJ$", name: "Fijian Dollar", country: "Fiji", iso: "fj" },
  { code: "MUR", symbol: "₨", name: "Mauritian Rupee", country: "Mauritius", iso: "mu" },
  { code: "BWP", symbol: "P", name: "Botswanan Pula", country: "Botswana", iso: "bw" },
  { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha", country: "Zambia", iso: "zm" },
  { code: "NAD", symbol: "N$", name: "Namibian Dollar", country: "Namibia", iso: "na" },
  { code: "MVR", symbol: "Rf", name: "Maldivian Rufiyaa", country: "Maldives", iso: "mv" },
  { code: "BTN", symbol: "Nu", name: "Bhutanese Ngultrum", country: "Bhutan", iso: "bt" },
  { code: "KHR", symbol: "៛", name: "Cambodian Riel", country: "Cambodia", iso: "kh" },
  { code: "LAK", symbol: "₭", name: "Lao Kip", country: "Laos", iso: "la" },
  { code: "BND", symbol: "B$", name: "Brunei Dollar", country: "Brunei", iso: "bn" },
  { code: "MNT", symbol: "₮", name: "Mongolian Tugrik", country: "Mongolia", iso: "mn" },
];

// ── COUNTRY PHONE CODES with ISO2 for SVG flags ────────────────────────────
// Flags from: https://hatscripts.github.io/circle-flags/flags/{iso2}.svg
const FLAG_CDN = "https://hatscripts.github.io/circle-flags/flags";
const Flag = ({ iso, size = 20 }: { iso: string; size?: number }) => (
  <img src={`${FLAG_CDN}/${iso.toLowerCase()}.svg`} alt="" width={size} height={size} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} loading="lazy" />
);

const COUNTRY_CODES = [
  { code: "+91", country: "India", iso: "in" },
  { code: "+1", country: "United States", iso: "us" },
  { code: "+44", country: "United Kingdom", iso: "gb" },
  { code: "+61", country: "Australia", iso: "au" },
  { code: "+81", country: "Japan", iso: "jp" },
  { code: "+86", country: "China", iso: "cn" },
  { code: "+49", country: "Germany", iso: "de" },
  { code: "+33", country: "France", iso: "fr" },
  { code: "+39", country: "Italy", iso: "it" },
  { code: "+34", country: "Spain", iso: "es" },
  { code: "+7", country: "Russia", iso: "ru" },
  { code: "+55", country: "Brazil", iso: "br" },
  { code: "+52", country: "Mexico", iso: "mx" },
  { code: "+82", country: "South Korea", iso: "kr" },
  { code: "+971", country: "UAE", iso: "ae" },
  { code: "+966", country: "Saudi Arabia", iso: "sa" },
  { code: "+65", country: "Singapore", iso: "sg" },
  { code: "+60", country: "Malaysia", iso: "my" },
  { code: "+66", country: "Thailand", iso: "th" },
  { code: "+62", country: "Indonesia", iso: "id" },
  { code: "+63", country: "Philippines", iso: "ph" },
  { code: "+84", country: "Vietnam", iso: "vn" },
  { code: "+880", country: "Bangladesh", iso: "bd" },
  { code: "+92", country: "Pakistan", iso: "pk" },
  { code: "+94", country: "Sri Lanka", iso: "lk" },
  { code: "+977", country: "Nepal", iso: "np" },
  { code: "+95", country: "Myanmar", iso: "mm" },
  { code: "+855", country: "Cambodia", iso: "kh" },
  { code: "+856", country: "Laos", iso: "la" },
  { code: "+673", country: "Brunei", iso: "bn" },
  { code: "+976", country: "Mongolia", iso: "mn" },
  { code: "+975", country: "Bhutan", iso: "bt" },
  { code: "+960", country: "Maldives", iso: "mv" },
  { code: "+93", country: "Afghanistan", iso: "af" },
  { code: "+98", country: "Iran", iso: "ir" },
  { code: "+964", country: "Iraq", iso: "iq" },
  { code: "+962", country: "Jordan", iso: "jo" },
  { code: "+961", country: "Lebanon", iso: "lb" },
  { code: "+972", country: "Israel", iso: "il" },
  { code: "+90", country: "Turkey", iso: "tr" },
  { code: "+20", country: "Egypt", iso: "eg" },
  { code: "+27", country: "South Africa", iso: "za" },
  { code: "+234", country: "Nigeria", iso: "ng" },
  { code: "+254", country: "Kenya", iso: "ke" },
  { code: "+233", country: "Ghana", iso: "gh" },
  { code: "+255", country: "Tanzania", iso: "tz" },
  { code: "+256", country: "Uganda", iso: "ug" },
  { code: "+251", country: "Ethiopia", iso: "et" },
  { code: "+212", country: "Morocco", iso: "ma" },
  { code: "+213", country: "Algeria", iso: "dz" },
  { code: "+216", country: "Tunisia", iso: "tn" },
  { code: "+218", country: "Libya", iso: "ly" },
  { code: "+249", country: "Sudan", iso: "sd" },
  { code: "+260", country: "Zambia", iso: "zm" },
  { code: "+263", country: "Zimbabwe", iso: "zw" },
  { code: "+267", country: "Botswana", iso: "bw" },
  { code: "+258", country: "Mozambique", iso: "mz" },
  { code: "+264", country: "Namibia", iso: "na" },
  { code: "+230", country: "Mauritius", iso: "mu" },
  { code: "+248", country: "Seychelles", iso: "sc" },
  { code: "+41", country: "Switzerland", iso: "ch" },
  { code: "+43", country: "Austria", iso: "at" },
  { code: "+31", country: "Netherlands", iso: "nl" },
  { code: "+32", country: "Belgium", iso: "be" },
  { code: "+46", country: "Sweden", iso: "se" },
  { code: "+47", country: "Norway", iso: "no" },
  { code: "+45", country: "Denmark", iso: "dk" },
  { code: "+358", country: "Finland", iso: "fi" },
  { code: "+48", country: "Poland", iso: "pl" },
  { code: "+420", country: "Czech Republic", iso: "cz" },
  { code: "+36", country: "Hungary", iso: "hu" },
  { code: "+40", country: "Romania", iso: "ro" },
  { code: "+359", country: "Bulgaria", iso: "bg" },
  { code: "+385", country: "Croatia", iso: "hr" },
  { code: "+381", country: "Serbia", iso: "rs" },
  { code: "+354", country: "Iceland", iso: "is" },
  { code: "+353", country: "Ireland", iso: "ie" },
  { code: "+351", country: "Portugal", iso: "pt" },
  { code: "+30", country: "Greece", iso: "gr" },
  { code: "+380", country: "Ukraine", iso: "ua" },
  { code: "+375", country: "Belarus", iso: "by" },
  { code: "+370", country: "Lithuania", iso: "lt" },
  { code: "+371", country: "Latvia", iso: "lv" },
  { code: "+372", country: "Estonia", iso: "ee" },
  { code: "+995", country: "Georgia", iso: "ge" },
  { code: "+374", country: "Armenia", iso: "am" },
  { code: "+994", country: "Azerbaijan", iso: "az" },
  { code: "+77", country: "Kazakhstan", iso: "kz" },
  { code: "+998", country: "Uzbekistan", iso: "uz" },
  { code: "+64", country: "New Zealand", iso: "nz" },
  { code: "+679", country: "Fiji", iso: "fj" },
  { code: "+675", country: "Papua New Guinea", iso: "pg" },
  { code: "+57", country: "Colombia", iso: "co" },
  { code: "+51", country: "Peru", iso: "pe" },
  { code: "+56", country: "Chile", iso: "cl" },
  { code: "+54", country: "Argentina", iso: "ar" },
  { code: "+58", country: "Venezuela", iso: "ve" },
  { code: "+593", country: "Ecuador", iso: "ec" },
  { code: "+591", country: "Bolivia", iso: "bo" },
  { code: "+595", country: "Paraguay", iso: "py" },
  { code: "+598", country: "Uruguay", iso: "uy" },
  { code: "+506", country: "Costa Rica", iso: "cr" },
  { code: "+507", country: "Panama", iso: "pa" },
  { code: "+1", country: "Canada", iso: "ca" },
  { code: "+1", country: "Jamaica", iso: "jm" },
  { code: "+1", country: "Trinidad", iso: "tt" },
  { code: "+974", country: "Qatar", iso: "qa" },
  { code: "+973", country: "Bahrain", iso: "bh" },
  { code: "+968", country: "Oman", iso: "om" },
  { code: "+965", country: "Kuwait", iso: "kw" },
  { code: "+853", country: "Macau", iso: "mo" },
  { code: "+852", country: "Hong Kong", iso: "hk" },
  { code: "+886", country: "Taiwan", iso: "tw" },
  { code: "+244", country: "Angola", iso: "ao" },
  { code: "+237", country: "Cameroon", iso: "cm" },
  { code: "+225", country: "Ivory Coast", iso: "ci" },
  { code: "+221", country: "Senegal", iso: "sn" },
  { code: "+243", country: "DR Congo", iso: "cd" },
  { code: "+250", country: "Rwanda", iso: "rw" },
  { code: "+261", country: "Madagascar", iso: "mg" },
  { code: "+509", country: "Haiti", iso: "ht" },
  { code: "+53", country: "Cuba", iso: "cu" },
  { code: "+1", country: "Dominican Republic", iso: "do" },
  { code: "+502", country: "Guatemala", iso: "gt" },
  { code: "+503", country: "El Salvador", iso: "sv" },
  { code: "+504", country: "Honduras", iso: "hn" },
  { code: "+505", country: "Nicaragua", iso: "ni" },
];

// ── SEARCHABLE SELECT COMPONENT ─────────────────────────────────────────────
function SearchSelect({ value, onChange, options, placeholder, renderOption, renderValue }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string; searchText: string }[];
  placeholder: string;
  renderOption: (opt: { value: string; label: string }) => React.ReactNode;
  renderValue: (v: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options.filter(o => !search || o.searchText.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white hover:border-gray-300 transition">
        <span className="truncate">{value ? renderValue(value) : <span className="text-gray-400">{placeholder}</span>}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No results</p>}
            {filtered.map(o => (
              <button key={o.value + o.label} type="button"
                onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition flex items-center justify-between ${value === o.value ? "bg-indigo-50 text-indigo-700" : "text-gray-700"}`}>
                {renderOption(o)}
                {value === o.value && <Check className="w-3 h-3 text-indigo-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CONSTANTS ───────────────────────────────────────────────────────────────
type Tab = "organization" | "team" | "invite" | "roles" | "billing" | "security" | "branding";
const ROLES = ["owner", "admin", "hr", "manager", "employee"];
const ROLE_COLORS: Record<string, string> = { owner: "bg-violet-100 text-violet-700 border-violet-200", admin: "bg-blue-100 text-blue-700 border-blue-200", hr: "bg-emerald-100 text-emerald-700 border-emerald-200", manager: "bg-amber-100 text-amber-700 border-amber-200", employee: "bg-gray-100 text-gray-600 border-gray-200" };
const ROLE_DESCRIPTIONS: Record<string, { title: string; desc: string; permissions: string[] }> = {
  owner: { title: "Owner", desc: "Full unrestricted access", permissions: ["All admin permissions", "Delete organization", "Manage billing", "Transfer ownership"] },
  admin: { title: "Admin", desc: "Full access except billing", permissions: ["Manage team", "Edit org settings", "All reports", "Store & finance", "Workflows"] },
  hr: { title: "HR", desc: "Employee lifecycle", permissions: ["Employee management", "Payroll", "Attendance", "Leaves", "Compliance"] },
  manager: { title: "Manager", desc: "Team oversight", permissions: ["View team", "Approve leaves", "Attendance reports", "Team performance"] },
  employee: { title: "Employee", desc: "Self-service only", permissions: ["Own profile", "Apply leaves", "View payslips", "Mark attendance", "Reimbursements"] },
};
const COUNTRIES = [
  { code: "IN", name: "India", iso: "in", phone: "+91" },
  { code: "US", name: "United States", iso: "us", phone: "+1" },
  { code: "GB", name: "United Kingdom", iso: "gb", phone: "+44" },
  { code: "CA", name: "Canada", iso: "ca", phone: "+1" },
  { code: "AU", name: "Australia", iso: "au", phone: "+61" },
  { code: "DE", name: "Germany", iso: "de", phone: "+49" },
  { code: "FR", name: "France", iso: "fr", phone: "+33" },
  { code: "JP", name: "Japan", iso: "jp", phone: "+81" },
  { code: "CN", name: "China", iso: "cn", phone: "+86" },
  { code: "SG", name: "Singapore", iso: "sg", phone: "+65" },
  { code: "AE", name: "United Arab Emirates", iso: "ae", phone: "+971" },
  { code: "SA", name: "Saudi Arabia", iso: "sa", phone: "+966" },
  { code: "BR", name: "Brazil", iso: "br", phone: "+55" },
  { code: "MX", name: "Mexico", iso: "mx", phone: "+52" },
  { code: "ZA", name: "South Africa", iso: "za", phone: "+27" },
  { code: "NG", name: "Nigeria", iso: "ng", phone: "+234" },
  { code: "KE", name: "Kenya", iso: "ke", phone: "+254" },
  { code: "EG", name: "Egypt", iso: "eg", phone: "+20" },
  { code: "KR", name: "South Korea", iso: "kr", phone: "+82" },
  { code: "ID", name: "Indonesia", iso: "id", phone: "+62" },
  { code: "MY", name: "Malaysia", iso: "my", phone: "+60" },
  { code: "TH", name: "Thailand", iso: "th", phone: "+66" },
  { code: "PH", name: "Philippines", iso: "ph", phone: "+63" },
  { code: "VN", name: "Vietnam", iso: "vn", phone: "+84" },
  { code: "BD", name: "Bangladesh", iso: "bd", phone: "+880" },
  { code: "PK", name: "Pakistan", iso: "pk", phone: "+92" },
  { code: "LK", name: "Sri Lanka", iso: "lk", phone: "+94" },
  { code: "NP", name: "Nepal", iso: "np", phone: "+977" },
  { code: "IT", name: "Italy", iso: "it", phone: "+39" },
  { code: "ES", name: "Spain", iso: "es", phone: "+34" },
  { code: "NL", name: "Netherlands", iso: "nl", phone: "+31" },
  { code: "SE", name: "Sweden", iso: "se", phone: "+46" },
  { code: "NO", name: "Norway", iso: "no", phone: "+47" },
  { code: "DK", name: "Denmark", iso: "dk", phone: "+45" },
  { code: "FI", name: "Finland", iso: "fi", phone: "+358" },
  { code: "CH", name: "Switzerland", iso: "ch", phone: "+41" },
  { code: "AT", name: "Austria", iso: "at", phone: "+43" },
  { code: "BE", name: "Belgium", iso: "be", phone: "+32" },
  { code: "IE", name: "Ireland", iso: "ie", phone: "+353" },
  { code: "PT", name: "Portugal", iso: "pt", phone: "+351" },
  { code: "PL", name: "Poland", iso: "pl", phone: "+48" },
  { code: "CZ", name: "Czech Republic", iso: "cz", phone: "+420" },
  { code: "RO", name: "Romania", iso: "ro", phone: "+40" },
  { code: "GR", name: "Greece", iso: "gr", phone: "+30" },
  { code: "TR", name: "Turkey", iso: "tr", phone: "+90" },
  { code: "RU", name: "Russia", iso: "ru", phone: "+7" },
  { code: "UA", name: "Ukraine", iso: "ua", phone: "+380" },
  { code: "IL", name: "Israel", iso: "il", phone: "+972" },
  { code: "QA", name: "Qatar", iso: "qa", phone: "+974" },
  { code: "KW", name: "Kuwait", iso: "kw", phone: "+965" },
  { code: "BH", name: "Bahrain", iso: "bh", phone: "+973" },
  { code: "OM", name: "Oman", iso: "om", phone: "+968" },
  { code: "JO", name: "Jordan", iso: "jo", phone: "+962" },
  { code: "GH", name: "Ghana", iso: "gh", phone: "+233" },
  { code: "TZ", name: "Tanzania", iso: "tz", phone: "+255" },
  { code: "UG", name: "Uganda", iso: "ug", phone: "+256" },
  { code: "ET", name: "Ethiopia", iso: "et", phone: "+251" },
  { code: "MA", name: "Morocco", iso: "ma", phone: "+212" },
  { code: "CO", name: "Colombia", iso: "co", phone: "+57" },
  { code: "AR", name: "Argentina", iso: "ar", phone: "+54" },
  { code: "CL", name: "Chile", iso: "cl", phone: "+56" },
  { code: "PE", name: "Peru", iso: "pe", phone: "+51" },
  { code: "NZ", name: "New Zealand", iso: "nz", phone: "+64" },
  { code: "HK", name: "Hong Kong", iso: "hk", phone: "+852" },
  { code: "TW", name: "Taiwan", iso: "tw", phone: "+886" },
  { code: "MV", name: "Maldives", iso: "mv", phone: "+960" },
  { code: "MU", name: "Mauritius", iso: "mu", phone: "+230" },
  { code: "FJ", name: "Fiji", iso: "fj", phone: "+679" },
];
const STATES_BY_COUNTRY: Record<string, string[]> = {
  IN: ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Chandigarh","Puducherry","Ladakh","J&K"],
  US: ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","DC"],
  GB: ["England","Scotland","Wales","Northern Ireland","London"],
  CA: ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland","Nova Scotia","Ontario","Prince Edward Island","Quebec","Saskatchewan"],
  AU: ["New South Wales","Victoria","Queensland","South Australia","Western Australia","Tasmania","ACT","Northern Territory"],
  DE: ["Baden-Württemberg","Bavaria","Berlin","Brandenburg","Bremen","Hamburg","Hesse","Lower Saxony","Mecklenburg-Vorpommern","North Rhine-Westphalia","Rhineland-Palatinate","Saarland","Saxony","Saxony-Anhalt","Schleswig-Holstein","Thuringia"],
  BR: ["São Paulo","Rio de Janeiro","Minas Gerais","Bahia","Paraná","Rio Grande do Sul","Pernambuco","Ceará","Goiás","Amazonas"],
  AE: ["Abu Dhabi","Dubai","Sharjah","Ajman","Umm Al Quwain","Ras Al Khaimah","Fujairah"],
};
const TIMEZONES = [
  { value: "Asia/Kolkata", label: "IST (UTC+5:30) India" },
  { value: "America/New_York", label: "EST (UTC-5) US East" },
  { value: "America/Chicago", label: "CST (UTC-6) US Central" },
  { value: "America/Denver", label: "MST (UTC-7) US Mountain" },
  { value: "America/Los_Angeles", label: "PST (UTC-8) US West" },
  { value: "Europe/London", label: "GMT (UTC+0) London" },
  { value: "Europe/Paris", label: "CET (UTC+1) Paris" },
  { value: "Europe/Berlin", label: "CET (UTC+1) Berlin" },
  { value: "Europe/Moscow", label: "MSK (UTC+3) Moscow" },
  { value: "Asia/Dubai", label: "GST (UTC+4) Dubai" },
  { value: "Asia/Karachi", label: "PKT (UTC+5) Karachi" },
  { value: "Asia/Dhaka", label: "BST (UTC+6) Dhaka" },
  { value: "Asia/Bangkok", label: "ICT (UTC+7) Bangkok" },
  { value: "Asia/Singapore", label: "SGT (UTC+8) Singapore" },
  { value: "Asia/Shanghai", label: "CST (UTC+8) Shanghai" },
  { value: "Asia/Tokyo", label: "JST (UTC+9) Tokyo" },
  { value: "Asia/Seoul", label: "KST (UTC+9) Seoul" },
  { value: "Australia/Sydney", label: "AEST (UTC+10) Sydney" },
  { value: "Pacific/Auckland", label: "NZST (UTC+12) Auckland" },
  { value: "America/Sao_Paulo", label: "BRT (UTC-3) Sao Paulo" },
  { value: "Africa/Lagos", label: "WAT (UTC+1) Lagos" },
  { value: "Africa/Nairobi", label: "EAT (UTC+3) Nairobi" },
  { value: "Africa/Johannesburg", label: "SAST (UTC+2) Johannesburg" },
  { value: "Asia/Riyadh", label: "AST (UTC+3) Riyadh" },
  { value: "Asia/Hong_Kong", label: "HKT (UTC+8) Hong Kong" },
  { value: "Asia/Jakarta", label: "WIB (UTC+7) Jakarta" },
  { value: "Asia/Kuala_Lumpur", label: "MYT (UTC+8) Kuala Lumpur" },
  { value: "Asia/Manila", label: "PHT (UTC+8) Manila" },
  { value: "Asia/Taipei", label: "CST (UTC+8) Taipei" },
  { value: "Asia/Colombo", label: "IST (UTC+5:30) Colombo" },
  { value: "Asia/Kathmandu", label: "NPT (UTC+5:45) Kathmandu" },
];

// ══════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const sb = useSB();
  const [tab, setTab] = useState<Tab>("organization");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [org, setOrg] = useState({
    name: "", industry: "", city: "", state: "", country: "IN", gstin: "", pan: "",
    address: "", pincode: "", phone: "", email: "", website: "",
    logo_url: "", timezone: "Asia/Kolkata", currency: "INR", country_code: "+91",
    financial_year_start: "april",
  });
  const [orgId, setOrgId] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [inviteName, setInviteName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [brandColor, setBrandColor] = useState("#6366F1");

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);
  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  useEffect(() => {
    (async () => {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      if (!email) { setLoading(false); return; }
      setUserEmail(email);

      // Resolve org ID with fallbacks
      const oid = await resolveOrgId(sb);
      if (!oid) { setLoading(false); return; }
      setOrgId(oid);

      // Fetch user role — try multiple approaches
      let detectedRole = "employee";
      const { data: exactUser } = await sb.from("users").select("role").eq("email", email).eq("org_id", oid).maybeSingle();
      if (exactUser?.role) { detectedRole = exactUser.role; }
      else {
        const { data: anyUser } = await sb.from("users").select("role").eq("email", email).maybeSingle();
        if (anyUser?.role) detectedRole = anyUser.role;
      }
      setUserRole(detectedRole);

      const [{ data: o }, { data: t }] = await Promise.all([
        sb.from("organizations").select("*").eq("id", oid).maybeSingle(),
        sb.from("users").select("id, full_name, email, role, status, created_at").eq("org_id", oid).order("created_at"),
      ]);
      if (o) {
        setOrg({
          name: o.name || "", industry: o.industry || "", city: o.city || "",
          state: o.state || "", country: o.country || "IN", gstin: o.gstin || "", pan: o.pan || "",
          address: o.address || "", pincode: o.pincode || "",
          phone: o.phone || "", email: o.email || "", website: o.website || "",
          logo_url: o.logo_url || "", timezone: o.timezone || "Asia/Kolkata",
          currency: o.currency || "INR", country_code: o.country_code || "+91",
          financial_year_start: o.financial_year_start || "april",
        });
        setOrgId(o.id);
        if (o.brand_color) setBrandColor(o.brand_color);
      }
      setTeam(t || []);
      setInviteLink(`${window.location.origin}/onboard/self?org=${oid}`);
      setLoading(false);
    })();
  }, [sb]);

  const isAdmin = ["owner", "admin"].includes(userRole);
  const isOwner = userRole === "owner";
  const isHRPlus = ["owner", "admin", "hr"].includes(userRole);

  // ── Save org (only send columns that exist) ─────────────────────────────
  const saveOrg = async () => {
    let oid = orgId || await resolveOrgId(sb);
    if (oid) setOrgId(oid);
    if (!oid) { showToast("No organization found — create one first", "error"); return; }
    setSaving(true);
    const { error } = await sb.from("organizations").update(org).eq("id", oid);
    if (error) {
      // Fallback: save only columns that definitely exist
      const safe = { name: org.name, industry: org.industry, city: org.city, state: org.state, gstin: org.gstin, country: org.country };
      const { error: e2 } = await sb.from("organizations").update(safe).eq("id", oid);
      showToast(e2 ? "Failed: " + e2.message : "Saved (run settings-columns.sql for all fields)", e2 ? "error" : "success");
    } else {
      showToast("Organization saved");
      if (typeof window !== "undefined") {
        localStorage.setItem("activeOrgName", org.name);
        // Reload after short delay so sidebar picks up new org name
        setTimeout(() => window.location.reload(), 800);
      }
    }
    setSaving(false);
  };

  const uploadLogo = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { showToast("Max 2MB", "error"); return; }
    setUploadingLogo(true);
    const path = `logos/${orgId}.${file.name.split(".").pop() || "png"}`;
    await sb.storage.from("org-assets").upload(path, file, { upsert: true });
    const { data } = sb.storage.from("org-assets").getPublicUrl(path);
    setOrg(o => ({ ...o, logo_url: data.publicUrl }));
    await sb.from("organizations").update({ logo_url: data.publicUrl }).eq("id", orgId);
    showToast("Logo uploaded"); setUploadingLogo(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await sb.from("users").update({ role: newRole }).eq("id", userId);
    if (!error) { setTeam(t => t.map(u => u.id === userId ? { ...u, role: newRole } : u)); showToast("Role updated"); }
    else showToast("Failed: " + error.message, "error");
    setEditingUser(null);
  };

  const removeUser = async (userId: string) => {
    await sb.from("users").delete().eq("id", userId);
    setTeam(t => t.filter(u => u.id !== userId));
    setShowRemoveConfirm(null); showToast("Member removed");
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return; setSaving(true);
    const email = inviteEmail.toLowerCase().trim();
    const { data: existing } = await sb.from("users").select("id").eq("email", email).eq("org_id", orgId).maybeSingle();
    if (existing) { showToast("Already in this org", "error"); setSaving(false); return; }
    const { error } = await sb.from("users").insert({ email, role: inviteRole, org_id: orgId, full_name: inviteName.trim() || email.split("@")[0], status: "invited" });
    if (error) showToast("Failed: " + error.message, "error");
    else { showToast(`Invited ${email}`); setInviteEmail(""); setInviteName(""); const { data: t } = await sb.from("users").select("id, full_name, email, role, status, created_at").eq("org_id", orgId).order("created_at"); setTeam(t || []); }
    setSaving(false);
  };

  const filteredTeam = team.filter(u => { const q = teamSearch.toLowerCase(); return !q || u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q); });
  const roleCounts = ROLES.reduce((a, r) => { a[r] = team.filter(u => u.role === r).length; return a; }, {} as Record<string, number>);

  const TABS: { id: Tab; label: string; icon: any; show: boolean }[] = [
    { id: "organization", label: "Organization", icon: Building2, show: true },
    { id: "team", label: "Team", icon: Users, show: true },
    { id: "invite", label: "Invite", icon: UserPlus, show: isHRPlus },
    { id: "roles", label: "Roles", icon: Shield, show: true },
    { id: "billing", label: "Billing", icon: CreditCard, show: isOwner },
    { id: "security", label: "Security", icon: Key, show: isAdmin },
    { id: "branding", label: "Branding", icon: Palette, show: isAdmin },
  ];

  if (loading) return <div className="flex items-center justify-center h-full py-20"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div><h1 className="text-xl font-bold text-gray-900">Settings</h1><p className="text-sm text-gray-400">Manage organization, team, and preferences</p></div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_COLORS[userRole] || ROLE_COLORS.employee}`}>{userRole || "employee"}</span>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ══════════ ORGANIZATION ══════════ */}
      {tab === "organization" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Organization profile</h2>
            <div className="flex items-start gap-5 mb-5">
              <div className="relative group">
                {org.logo_url ? <img src={org.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover border shadow-sm" /> :
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm">{org.name.charAt(0).toUpperCase() || "O"}</div>}
                <button onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                  className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  {uploadingLogo ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Organization name</label>
                <input value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { k: "industry", l: "Industry", p: "Technology" },
                { k: "email", l: "Business email", p: "info@company.com" },
                { k: "website", l: "Website", p: "https://company.com" },
                { k: "gstin", l: "GSTIN", p: "22AAACI1681G1Z5" },
                { k: "pan", l: "PAN", p: "AAACI1681G" },
              ].map(f => (
                <div key={f.k}><label className="block text-xs font-semibold text-gray-500 mb-1">{f.l}</label>
                  <input value={(org as any)[f.k]} onChange={e => setOrg(o => ({ ...o, [f.k]: e.target.value }))} placeholder={f.p}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
              ))}
              {/* Phone with country code */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                <div className="flex gap-1.5">
                  <div className="w-28 flex-shrink-0">
                    <SearchSelect
                      value={org.country_code}
                      onChange={v => setOrg(o => ({ ...o, country_code: v }))}
                      options={COUNTRY_CODES.map(c => ({ value: c.code + "|" + c.iso, label: `${c.code} ${c.country}`, searchText: `${c.code} ${c.country}` }))}
                      placeholder="+91"
                      renderOption={o => {
                        const iso = o.value.split("|")[1];
                        return <span className="flex items-center gap-2"><Flag iso={iso} size={16} />{o.label}</span>;
                      }}
                      renderValue={v => {
                        const parts = v.split("|");
                        const cc = COUNTRY_CODES.find(x => x.code === parts[0] && x.iso === parts[1]);
                        return cc ? <span className="flex items-center gap-1.5"><Flag iso={cc.iso} size={16} />{cc.code}</span> : <>{parts[0]}</>;
                      }}
                    />
                  </div>
                  <input value={org.phone} onChange={e => setOrg(o => ({ ...o, phone: e.target.value.replace(/[^\d\s-]/g, "") }))} placeholder="98765 43210"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Address</h2>
            {/* Country */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Country</label>
              <SearchSelect value={org.country} onChange={v => {
                const c = COUNTRIES.find(x => x.code === v);
                setOrg(o => ({ ...o, country: v, state: "", country_code: c?.phone || o.country_code }));
              }}
                options={COUNTRIES.map(c => ({ value: c.code, label: c.name, searchText: `${c.code} ${c.name}` }))}
                placeholder="Select country"
                renderOption={o => { const c = COUNTRIES.find(x => x.code === o.value); return <span className="flex items-center gap-2">{c && <Flag iso={c.iso} size={16} />}{o.label}</span>; }}
                renderValue={v => { const c = COUNTRIES.find(x => x.code === v); return c ? <span className="flex items-center gap-1.5"><Flag iso={c.iso} size={16} />{c.name}</span> : <>{v}</>; }} />
            </div>
            <textarea value={org.address} onChange={e => setOrg(o => ({ ...o, address: e.target.value }))} rows={2} placeholder="Street address, building, floor"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
                <input value={org.city} onChange={e => setOrg(o => ({ ...o, city: e.target.value }))} placeholder="City" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">
                {org.country === "US" ? "State" : org.country === "GB" ? "Region" : org.country === "CA" ? "Province" : org.country === "AU" ? "State/Territory" : org.country === "AE" ? "Emirate" : "State / Region"}
              </label>
                {STATES_BY_COUNTRY[org.country] ? (
                  <SearchSelect value={org.state} onChange={v => setOrg(o => ({ ...o, state: v }))}
                    options={(STATES_BY_COUNTRY[org.country] || []).map(s => ({ value: s, label: s, searchText: s }))}
                    placeholder={`Select ${org.country === "GB" ? "region" : org.country === "CA" ? "province" : "state"}`}
                    renderOption={o => <span>{o.label}</span>} renderValue={v => <>{v}</>} />
                ) : (
                  <input value={org.state} onChange={e => setOrg(o => ({ ...o, state: e.target.value }))} placeholder="State / Region / Province"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                )}</div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">
                {org.country === "US" ? "ZIP Code" : org.country === "GB" ? "Postcode" : org.country === "IN" ? "Pincode" : "Postal code"}
              </label>
                <input value={org.pincode} onChange={e => setOrg(o => ({ ...o, pincode: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "").slice(0, 10) }))}
                  placeholder={org.country === "US" ? "10001" : org.country === "GB" ? "SW1A 1AA" : org.country === "IN" ? "400001" : "Postal code"}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Preferences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Currency</label>
                <SearchSelect value={org.currency} onChange={v => setOrg(o => ({ ...o, currency: v }))}
                  options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.code} — ${c.name} (${c.country})`, searchText: `${c.code} ${c.name} ${c.country} ${c.symbol}` }))}
                  placeholder="Select currency"
                  renderOption={o => { const c = CURRENCIES.find(x => x.code === o.value); return <span className="flex items-center gap-2">{c && <Flag iso={c.iso} size={16} />}{o.label}</span>; }}
                  renderValue={v => { const c = CURRENCIES.find(x => x.code === v); return c ? <span className="flex items-center gap-1.5"><Flag iso={c.iso} size={16} />{c.symbol} {c.code} — {c.name}</span> : <>{v}</>; }} /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Timezone</label>
                <SearchSelect value={org.timezone} onChange={v => setOrg(o => ({ ...o, timezone: v }))}
                  options={TIMEZONES.map(t => ({ value: t.value, label: t.label, searchText: `${t.value} ${t.label}` }))}
                  placeholder="Select timezone"
                  renderOption={o => <span>{o.label}</span>}
                  renderValue={v => { const t = TIMEZONES.find(x => x.value === v); return t ? t.label : v; }} /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Financial year starts</label>
                <SearchSelect value={org.financial_year_start} onChange={v => setOrg(o => ({ ...o, financial_year_start: v }))}
                  options={["january","february","march","april","may","june","july","august","september","october","november","december"].map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1), searchText: m }))}
                  placeholder="Select month"
                  renderOption={o => <span>{o.label}</span>}
                  renderValue={v => <>{v.charAt(0).toUpperCase() + v.slice(1)}</>} /></div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveOrg} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save changes
            </button>
          </div>
        </div>
      )}

      {/* ══════════ TEAM ══════════ */}
      {tab === "team" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{ROLES.map(r => (
            <div key={r} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm"><p className="text-lg font-bold text-gray-900">{roleCounts[r] || 0}</p><p className="text-[10px] text-gray-400 uppercase">{r}s</p></div>
          ))}</div>
          <div className="flex items-center gap-3"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={teamSearch} onChange={e => setTeamSearch(e.target.value)} placeholder="Search…" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" /></div><span className="text-xs text-gray-400">{filteredTeam.length} of {team.length}</span></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
              {["Member", "Email", "Role", "Status", "Joined", ""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {filteredTeam.map(u => {
                const isMe = u.email === userEmail;
                const canEdit = isAdmin && !isMe && !(u.role === "owner" && !isOwner);
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${u.role === "owner" ? "bg-violet-100 text-violet-600" : u.role === "admin" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}>{(u.full_name || u.email).charAt(0).toUpperCase()}</div><p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">{u.full_name || u.email.split("@")[0]}{isMe && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] rounded font-bold">YOU</span>}{u.role === "owner" && <Crown className="w-3 h-3 text-amber-500" />}</p></div></td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{u.email}</td>
                    <td className="px-5 py-3.5">{editingUser === u.id && canEdit ? (
                      <select value={u.role || "employee"} onChange={e => updateUserRole(u.id, e.target.value)} autoFocus onBlur={() => setEditingUser(null)} className="text-xs font-medium px-2 py-1.5 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200">{ROLES.filter(r => isOwner || r !== "owner").map(r => <option key={r} value={r}>{r}</option>)}</select>
                    ) : (
                      <button onClick={() => canEdit && setEditingUser(u.id)} disabled={!canEdit} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_COLORS[u.role] || ROLE_COLORS.employee} ${canEdit ? "cursor-pointer hover:shadow-sm" : ""}`}>{u.role || "employee"}</button>
                    )}</td>
                    <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : u.status === "invited" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{u.status || "active"}</span></td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-5 py-3.5">{canEdit && (showRemoveConfirm === u.id ? <div className="flex gap-1"><button onClick={() => removeUser(u.id)} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded">Remove</button><button onClick={() => setShowRemoveConfirm(null)} className="px-2 py-1 text-gray-500 text-[10px]">Cancel</button></div> : <button onClick={() => setShowRemoveConfirm(u.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50"><UserMinus className="w-4 h-4" /></button>)}</td>
                  </tr>
                );
              })}
            </tbody></table>
            {filteredTeam.length === 0 && <div className="py-12 text-center text-sm text-gray-400">No members found</div>}
          </div>
        </div>
      )}

      {/* ══════════ INVITE ══════════ */}
      {tab === "invite" && isHRPlus && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Invite team member</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Full name" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email" type="email" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-200">{ROLES.filter(r => isOwner || r !== "owner").map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select>
              <button onClick={sendInvite} disabled={saving || !inviteEmail.trim()} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"><UserPlus className="w-4 h-4" />Invite</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Self-onboarding link</h2>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
              <code className="flex-1 text-xs text-gray-600 truncate font-mono">{inviteLink}</code>
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${copied ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}>
                {copied ? <><Check className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ROLES ══════════ */}
      {tab === "roles" && (
        <div className="space-y-4">{ROLES.map(r => { const info = ROLE_DESCRIPTIONS[r]; return (
          <div key={r} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${ROLE_COLORS[r]}`}>{r === "owner" && <Crown className="w-3 h-3 inline mr-1" />}{info.title}</span>
              <span className="text-xs text-gray-400">{roleCounts[r] || 0} member{(roleCounts[r] || 0) !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{info.desc}</p>
            <div className="flex flex-wrap gap-2">{info.permissions.map(p => <span key={p} className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-lg border border-gray-100"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{p}</span>)}</div>
          </div>
        ); })}</div>
      )}

      {/* ══════════ BILLING ══════════ */}
      {tab === "billing" && isOwner && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200 mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center"><CreditCard className="w-6 h-6 text-white" /></div>
            <div className="flex-1"><p className="text-lg font-bold text-gray-900 capitalize">{org.name} — Starter</p><p className="text-xs text-gray-500">{team.length} members · {org.currency}</p></div>
            <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" />Upgrade</button>
          </div>
        </div>
      )}

      {/* ══════════ SECURITY ══════════ */}
      {tab === "security" && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Security settings</h2>
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200"><div><p className="text-sm font-semibold text-gray-900">Session timeout</p><p className="text-xs text-gray-400">Auto-logout after inactivity</p></div><select className="px-3 py-2 border border-gray-200 rounded-lg text-sm appearance-none"><option>30 min</option><option>1 hour</option><option>4 hours</option><option>8 hours</option><option>24 hours</option></select></div>
          </div>
          {isOwner && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
              <button onClick={() => setShowDangerZone(!showDangerZone)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-red-50"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-sm font-bold text-red-700">Danger zone</span></div><ChevronDown className={`w-4 h-4 text-red-400 transition-transform ${showDangerZone ? "rotate-180" : ""}`} /></button>
              {showDangerZone && <div className="px-6 py-4 border-t border-red-200 bg-red-50/50 space-y-3"><p className="text-sm text-red-700">Permanently delete this organization. Cannot be undone.</p><div className="flex gap-2"><input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={`Type "${org.name}" to confirm`} className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none bg-white" /><button disabled={deleteConfirm !== org.name} className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-30 hover:bg-red-700 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Delete</button></div></div>}
            </div>
          )}
        </div>
      )}

      {/* ══════════ BRANDING ══════════ */}
      {tab === "branding" && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Brand color</h2>
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
              <input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono w-28 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <div className="flex gap-2">{["#6366F1","#22C55E","#EF4444","#F59E0B","#8B5CF6","#06B6D4","#EC4899","#0F172A"].map(c => <button key={c} onClick={() => setBrandColor(c)} className={`w-7 h-7 rounded-lg border-2 ${brandColor === c ? "border-gray-900 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />)}</div>
            </div>
            <div className="mt-4 p-4 rounded-xl border border-gray-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: brandColor }}>{org.name.charAt(0)}</div>
              <span className="font-bold text-sm" style={{ color: brandColor }}>{org.name || "Company"}</span>
              <div className="ml-auto flex gap-2"><button className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg" style={{ backgroundColor: brandColor }}>Primary</button><button className="px-3 py-1.5 text-xs font-semibold rounded-lg border" style={{ color: brandColor, borderColor: brandColor }}>Secondary</button></div>
            </div>
          </div>
          <div className="flex justify-end"><button onClick={async () => { await sb.from("organizations").update({ brand_color: brandColor }).eq("id", orgId); showToast("Branding saved"); }} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"><Save className="w-4 h-4" />Save branding</button></div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.msg}
          <button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}