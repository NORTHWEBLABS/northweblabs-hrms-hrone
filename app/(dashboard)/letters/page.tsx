"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Search, X, Loader2, CheckCircle2, Printer, Eye, Edit2, RefreshCw,
  Copy, Maximize2, Minimize2, PanelLeft, ChevronDown, ChevronLeft, ChevronRight,
  Check, Calendar,
} from "lucide-react";

function useSB() { return useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []); }
async function getOrgId(sb: any) {
  let o = typeof window!=="undefined"?localStorage.getItem("activeOrgId")||"":"";
  if(o)return o;
  const em=typeof window!=="undefined"?localStorage.getItem("userEmail")||"":"";
  if(em){const{data:d}=await sb.from("users").select("org_id").eq("email",em).maybeSingle();if(d?.org_id){localStorage.setItem("activeOrgId",d.org_id);return d.org_id;}}
  const{data:f}=await sb.from("organizations").select("id").limit(1).maybeSingle();
  if(f?.id){localStorage.setItem("activeOrgId",f.id);return f.id;}return "";
}

const FLAG_CDN="https://hatscripts.github.io/circle-flags/flags";
const Flag=({iso,s=16}:{iso:string;s?:number})=>(<img src={`${FLAG_CDN}/${iso}.svg`} alt="" width={s} height={s} className="rounded-full object-cover flex-shrink-0" loading="lazy"/>);

// ── Currencies ──
const CURRS=[
  {code:"INR",sym:"₹",iso:"in",name:"Indian Rupee"},{code:"USD",sym:"$",iso:"us",name:"US Dollar"},
  {code:"EUR",sym:"€",iso:"eu",name:"Euro"},{code:"GBP",sym:"£",iso:"gb",name:"British Pound"},
  {code:"AED",sym:"د.إ",iso:"ae",name:"UAE Dirham"},{code:"SAR",sym:"﷼",iso:"sa",name:"Saudi Riyal"},
  {code:"JPY",sym:"¥",iso:"jp",name:"Japanese Yen"},{code:"CNY",sym:"¥",iso:"cn",name:"Chinese Yuan"},
  {code:"AUD",sym:"A$",iso:"au",name:"Australian Dollar"},{code:"CAD",sym:"C$",iso:"ca",name:"Canadian Dollar"},
  {code:"SGD",sym:"S$",iso:"sg",name:"Singapore Dollar"},{code:"MYR",sym:"RM",iso:"my",name:"Malaysian Ringgit"},
  {code:"THB",sym:"฿",iso:"th",name:"Thai Baht"},{code:"BRL",sym:"R$",iso:"br",name:"Brazilian Real"},
  {code:"ZAR",sym:"R",iso:"za",name:"South African Rand"},{code:"NGN",sym:"₦",iso:"ng",name:"Nigerian Naira"},
  {code:"KES",sym:"KSh",iso:"ke",name:"Kenyan Shilling"},{code:"BDT",sym:"৳",iso:"bd",name:"Bangladeshi Taka"},
  {code:"PKR",sym:"₨",iso:"pk",name:"Pakistani Rupee"},{code:"LKR",sym:"₨",iso:"lk",name:"Sri Lankan Rupee"},
  {code:"NPR",sym:"₨",iso:"np",name:"Nepalese Rupee"},{code:"QAR",sym:"﷼",iso:"qa",name:"Qatari Riyal"},
  {code:"KWD",sym:"د.ك",iso:"kw",name:"Kuwaiti Dinar"},{code:"CHF",sym:"Fr",iso:"ch",name:"Swiss Franc"},
];

// ── SearchSelect ──
function SS({value,onChange,options,placeholder,className}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string;sub?:string;icon?:React.ReactNode}[];placeholder:string;className?:string}){
  const[open,setOpen]=useState(false);const[q,setQ]=useState("");const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[]);
  const fil=options.filter(o=>!q||o.label.toLowerCase().includes(q.toLowerCase())||(o.sub||"").toLowerCase().includes(q.toLowerCase()));
  const sel=options.find(o=>o.value===value);
  return(<div className={`relative ${className||""}`} ref={ref}>
    <button type="button" onClick={()=>{setOpen(!open);setQ("")}} className="w-full flex items-center gap-2 justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-left hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition shadow-sm">
      {sel?.icon}{sel?<span className="truncate font-medium text-gray-900">{sel.label}</span>:<span className="text-gray-400">{placeholder}</span>}
      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition ${open?"rotate-180":""}`}/>
    </button>
    {open&&<div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
      <div className="p-2 border-b border-gray-100"><div className="relative"><Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." autoFocus className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"/></div></div>
      <div className="max-h-52 overflow-y-auto">{fil.length===0&&<p className="text-xs text-gray-400 text-center py-4">No results</p>}
        {fil.map(o=>(<button key={o.value+o.label} type="button" onClick={()=>{onChange(o.value);setOpen(false)}}
          className={`w-full text-left px-3 py-2.5 text-xs hover:bg-indigo-50 flex items-center gap-2.5 transition ${value===o.value?"bg-indigo-50 text-indigo-700":"text-gray-700"}`}>
          {o.icon}<div className="flex-1 min-w-0"><p className="font-medium truncate">{o.label}</p>{o.sub&&<p className="text-gray-400 text-[10px] truncate">{o.sub}</p>}</div>
          {value===o.value&&<Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0"/>}
        </button>))}
      </div>
    </div>}
  </div>);
}

// ── Calendar DatePicker ──
function DP({value,onChange,label}:{value:string;onChange:(v:string)=>void;label?:string}){
  const[open,setOpen]=useState(false);
  const[vd,setVd]=useState(()=>value?new Date(value):new Date());
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[]);
  const y=vd.getFullYear(),m=vd.getMonth(),fd=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate();
  const td=new Date(),ts=`${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,"0")}-${String(td.getDate()).padStart(2,"0")}`;
  const ms=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const display=value?new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"";
  const sel=(d:number)=>{onChange(`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);setOpen(false)};
  const days:Array<number|null>=[];for(let i=0;i<fd;i++)days.push(null);for(let d=1;d<=dim;d++)days.push(d);
  return(<div className="relative" ref={ref}>
    {label&&<label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>}
    <button type="button" onClick={()=>{setOpen(!open);if(value)setVd(new Date(value))}}
      className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-left hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition shadow-sm">
      <span className={value?"text-gray-900 font-medium":"text-gray-400"}>{display||"Select date"}</span>
      <Calendar className="w-4 h-4 text-gray-400"/>
    </button>
    {open&&<div className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 w-[272px]">
      {value&&<div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl px-4 py-2.5 mb-3"><p className="text-[9px] text-indigo-200 uppercase tracking-wider">Selected</p><p className="text-base font-bold text-white">{new Date(value).toLocaleDateString("en-IN",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</p></div>}
      <div className="flex items-center justify-between mb-2"><button onClick={()=>setVd(new Date(y,m-1,1))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"><ChevronLeft className="w-4 h-4 text-gray-500"/></button><span className="text-sm font-bold text-gray-900">{ms[m]} {y}</span><button onClick={()=>setVd(new Date(y,m+1,1))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"><ChevronRight className="w-4 h-4 text-gray-500"/></button></div>
      <div className="grid grid-cols-7 mb-1">{["S","M","T","W","T","F","S"].map((d,i)=><div key={i} className="text-center text-[9px] font-bold text-gray-400 py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-px">{days.map((day,i)=>{if(!day)return<div key={i}/>;const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;return(
        <button key={i} onClick={()=>sel(day)} type="button" className={`w-[34px] h-[34px] rounded-full text-sm flex items-center justify-center transition font-medium ${ds===value?"bg-indigo-600 text-white shadow":ds===ts?"ring-2 ring-indigo-300 text-indigo-600":"text-gray-700 hover:bg-gray-100"}`}>{day}</button>)})}</div>
      <div className="flex justify-between mt-2.5 pt-2.5 border-t border-gray-100"><button onClick={()=>{onChange("");setOpen(false)}} className="text-xs font-semibold text-gray-400 hover:text-gray-600">Clear</button><div className="flex gap-2"><button onClick={()=>{onChange(ts);setOpen(false)}} className="text-xs font-semibold text-indigo-600">Today</button><button onClick={()=>setOpen(false)} className="text-xs font-bold text-indigo-600">OK</button></div></div>
    </div>}
  </div>);
}

// ── CTC Input with currency ──
function CTCInput({value,onChange,currency,onCurrencyChange}:{value:string;onChange:(v:string)=>void;currency:string;onCurrencyChange:(v:string)=>void}){
  const n=Number(value)||0;const cur=CURRS.find(c=>c.code===currency)||CURRS[0];
  return(<div className="space-y-2">
    <div className="flex gap-1.5">
      <SS value={currency} onChange={onCurrencyChange} className="w-[130px] flex-shrink-0"
        options={CURRS.map(c=>({value:c.code,label:`${c.sym} ${c.code}`,sub:c.name,icon:<Flag iso={c.iso} s={18}/>}))} placeholder="Currency"/>
      <div className="relative flex-1"><span className="absolute left-3 top-2.5 text-sm font-bold text-gray-400">{cur.sym}</span>
        <input type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder="Annual CTC"
          className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm hover:border-indigo-300 transition"/></div>
    </div>
    {n>0&&<div className="grid grid-cols-3 gap-1.5">
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl px-2 py-2 text-center border border-indigo-100"><p className="text-xs font-bold text-indigo-700">{cur.sym}{Math.round(n/12).toLocaleString("en-IN")}</p><p className="text-[8px] font-semibold text-indigo-400 uppercase">Monthly</p></div>
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl px-2 py-2 text-center border border-emerald-100"><p className="text-xs font-bold text-emerald-700">{cur.sym}{Math.round(n/52).toLocaleString("en-IN")}</p><p className="text-[8px] font-semibold text-emerald-400 uppercase">Weekly</p></div>
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl px-2 py-2 text-center border border-amber-100"><p className="text-xs font-bold text-amber-700">{cur.sym}{Math.round(n/365).toLocaleString("en-IN")}</p><p className="text-[8px] font-semibold text-amber-400 uppercase">Daily</p></div>
    </div>}
  </div>);
}

function numToWords(n:number):string{
  if(n===0)return"Zero";const a=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if(n<20)return a[n];if(n<100)return b[Math.floor(n/10)]+(n%10?" "+a[n%10]:"");if(n<1000)return a[Math.floor(n/100)]+" Hundred"+(n%100?" and "+numToWords(n%100):"");
  if(n<100000)return numToWords(Math.floor(n/1000))+" Thousand"+(n%1000?" "+numToWords(n%1000):"");
  if(n<10000000)return numToWords(Math.floor(n/100000))+" Lakh"+(n%100000?" "+numToWords(n%100000):"");
  return numToWords(Math.floor(n/10000000))+" Crore"+(n%10000000?" "+numToWords(n%10000000):"");
}

interface Emp{id:string;full_name:string;email:string;department:string|null;designation:string|null;date_of_joining:string|null;joining_date:string|null;employee_code:string|null}
interface Org{name:string;address:string;city:string;state:string;pincode:string;phone:string;email:string;website:string;logo_url:string;gstin:string}
interface Tpl{id:string;name:string;abbr:string;body:string;color:string}

const fmtD=(d:string|null)=>d?new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):"___________";
const todayF=()=>new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});

const TPLS:Tpl[]=[
  {id:"exp",name:"Experience Letter",abbr:"EXP",color:"#6366F1",body:`TO WHOM IT MAY CONCERN

Date: {current_date}

This is to certify that {employee_name} (Employee ID: {employee_code}) was employed with {company_name} from {joining_date} to {last_working_date} in the capacity of {designation} within the {department} department.

During {his_her} tenure with our organization, {employee_name} was responsible for handling all duties and responsibilities assigned to {his_her} role with utmost diligence, professionalism, and commitment. {he_she} consistently demonstrated a high degree of competence, integrity, and dedication towards {his_her} work.

{employee_name} exhibited the following qualities during {his_her} employment:

- Strong technical knowledge and domain expertise in {his_her} area of work
- Excellent communication and interpersonal skills
- Ability to work effectively both independently and as part of a team
- Proactive approach to problem-solving and process improvement
- Consistent adherence to company policies, procedures, and ethical standards
- Positive attitude and willingness to take on additional responsibilities

{he_she} maintained cordial and professional relationships with colleagues, supervisors, and clients throughout {his_her} association with us. {his_her} contributions to the team and the organization have been valuable and appreciated.

{employee_name} has left the organization on {his_her} own accord, and {his_her} separation has been processed in accordance with company policy. All dues and settlements have been cleared as per the terms of employment.

We wish {employee_name} all the very best in {his_her} future professional and personal endeavors. We are confident that {he_she} will be a valuable asset to any organization {he_she} joins.

This letter is issued upon request for whatever purpose it may serve. It does not constitute any commitment, guarantee, or obligation on the part of {company_name}.

For {company_name},


{authorized_name}
{authorized_designation}
{company_name}
{company_address}

Note: This is a computer-generated letter and is valid without signature.`},

  {id:"rel",name:"Relieving Letter",abbr:"REL",color:"#22C55E",body:`Date: {current_date}
Ref: {company_name}/HR/REL/{year}/{employee_code}

To,
{employee_name}
{employee_address}

Subject: Relieving Letter

Dear {employee_name},

This letter is in reference to your resignation letter dated {resignation_date} from the position of {designation} in the {department} department at {company_name}.

We hereby confirm that your resignation has been duly accepted by the management, and you are officially relieved from your duties and responsibilities at {company_name} with effect from {last_working_date} (your last working day).

During your tenure from {joining_date} to {last_working_date}, you served as {designation} and performed your duties in a satisfactory manner. Your contributions to the team and the organization during this period are acknowledged and appreciated.

We confirm that:

1. All pending dues, including your final salary, leave encashment, and other applicable benefits, have been settled as per company policy.
2. You have completed the exit formalities, including the handover of all company assets, documents, access cards, and any other company property in your possession.
3. Your Provident Fund (PF), Employee State Insurance (ESI), and other statutory contributions have been updated and relevant forms will be processed.
4. You have returned all confidential and proprietary information belonging to the company.
5. A separate experience certificate is being issued as applicable.

We kindly remind you that the confidentiality and non-disclosure obligations as outlined in your employment agreement shall continue to remain in effect even after the cessation of your employment.

We thank you for your valuable contributions to {company_name} and wish you great success and fulfillment in your future endeavors.

Should you require any assistance or documentation in the future, please do not hesitate to reach out to the HR department.

Warm regards,


{authorized_name}
{authorized_designation}
Human Resources Department
{company_name}
{company_address}
Phone: {company_phone} | Email: {company_email}`},

  {id:"ofr",name:"Offer Letter",abbr:"OFR",color:"#F59E0B",body:`Date: {current_date}
Ref: {company_name}/HR/OFFER/{year}/{employee_code}

PRIVATE & CONFIDENTIAL

To,
{employee_name}
{employee_address}

Subject: Offer of Employment — {designation}

Dear {employee_name},

We are delighted to inform you that based on your application and subsequent interview, the management of {company_name} has decided to offer you the position of {designation} in the {department} department. We believe your skills, experience, and qualifications make you an excellent fit for our team.

Please find below the details of your employment offer:

POSITION DETAILS:
- Designation: {designation}
- Department: {department}
- Date of Joining: {joining_date}
- Reporting To: {reporting_manager}
- Place of Work: {company_address}
- Employment Type: Full-time / Permanent

COMPENSATION:
- Annual CTC: {ctc_formatted} ({ctc_words})
- Monthly Gross: {monthly_gross}
- The detailed compensation breakdown including Basic Salary, HRA, Special Allowance, PF, and other components will be shared in your appointment letter upon joining.

TERMS & CONDITIONS:
1. This offer is subject to satisfactory completion of background verification and reference checks.
2. You are required to submit all original documents for verification on the date of joining.
3. You will be on a probationary period of 6 months from the date of joining, during which your performance will be evaluated.
4. The notice period during probation is 30 days from either side.
5. You are required to maintain strict confidentiality regarding all proprietary information, trade secrets, and business affairs of the company during and after your employment.

DOCUMENTS REQUIRED AT JOINING:
- Original and photocopies of educational certificates
- Previous employment relieving and experience letters
- Salary slips of last 3 months from previous employer
- Valid government ID proof (Aadhaar, PAN, Passport)
- 4 passport-size photographs
- Bank account details for salary processing
- Medical fitness certificate (if applicable)

Please confirm your acceptance of this offer by signing and returning a copy of this letter to the HR department within 7 (seven) days from the date of this letter. Failure to respond within the stipulated time may result in the withdrawal of this offer.

We look forward to welcoming you to the {company_name} family and wish you a rewarding and successful career with us!

With warm regards,


{authorized_name}
{authorized_designation}
{company_name}`},

  {id:"apt",name:"Appointment Letter",abbr:"APT",color:"#8B5CF6",body:`Date: {current_date}
Ref: {company_name}/HR/APPT/{year}/{employee_code}

{employee_name}
{employee_address}

Subject: Letter of Appointment

Dear {employee_name},

With reference to your application and subsequent interview, we are pleased to formally appoint you as {designation} in the {department} department of {company_name}, on the following terms and conditions:

1. DATE OF JOINING: Your employment shall commence from {joining_date}.

2. DESIGNATION: You shall be designated as {designation} and will be reporting to {reporting_manager}.

3. PROBATION: You will be on probation for a period of 6 (six) months from the date of joining. Your performance will be reviewed at the end of the probation period.

4. WORKING HOURS: Standard working hours are 9:00 AM to 6:00 PM, Monday to Friday. You may be required to work additional hours based on business requirements.

5. COMPENSATION: Your monthly gross salary shall be {monthly_gross}. The detailed salary structure including Basic Pay, HRA, Special Allowance, and other components is enclosed separately.

6. LEAVE POLICY: You shall be entitled to leaves as per the company leave policy applicable from time to time.

7. NOTICE PERIOD: Either party may terminate the employment by giving 30 (thirty) days written notice or payment in lieu thereof.

8. CONFIDENTIALITY: You shall maintain strict confidentiality regarding all proprietary information, trade secrets, client data, and business affairs of the company during and after your employment.

9. CODE OF CONDUCT: You are expected to abide by the rules, regulations, and code of conduct as prescribed by the company from time to time.

10. TERMINATION: The company reserves the right to terminate your employment without notice in case of misconduct, negligence, or breach of any terms of this agreement.

Please sign and return the duplicate copy of this letter as a token of your acceptance of the above terms and conditions.

We welcome you to the {company_name} family and wish you a long and rewarding career with us.

For {company_name},


{authorized_name}
{authorized_designation}

ACCEPTANCE:
I, {employee_name}, have read, understood, and accept the terms and conditions mentioned above.

Signature: _______________ Date: _______________`},

  {id:"wrn",name:"Warning Letter",abbr:"WRN",color:"#EF4444",body:`STRICTLY CONFIDENTIAL

Date: {current_date}
Ref: {company_name}/HR/WARN/{year}/{employee_code}

To,
{employee_name}
Employee ID: {employee_code}
Department: {department}
Designation: {designation}

Subject: Formal Written Warning

Dear {employee_name},

This letter serves as a formal written warning issued to you by the management of {company_name} regarding the following matter:

REASON FOR WARNING:
{warning_reason}

BACKGROUND:
Despite verbal counseling provided to you on {verbal_warning_date} by your reporting manager / HR department, the following issues and violations have been observed and documented:

1. {issue_1}
2. {issue_2}

The above behavior / performance issues are in direct violation of the company code of conduct and employment policies, and are deemed unacceptable by the management.

ACTION REQUIRED:
You are hereby directed to:
- Immediately cease and rectify the above-mentioned issues
- Strictly adhere to all company policies, rules, and regulations going forward
- Schedule a meeting with your reporting manager within 3 working days to discuss a performance improvement plan
- Demonstrate sustained improvement in the areas identified above

CONSEQUENCES:
Please be advised that this written warning will be placed in your personnel file. Any further instances of similar behavior, non-compliance, or failure to demonstrate adequate improvement may result in more severe disciplinary action, up to and including:
- Suspension without pay
- Demotion
- Termination of employment

We trust that you will take this warning seriously and take the necessary corrective measures immediately.

Issued by:

{authorized_name}
{authorized_designation}
{company_name}

EMPLOYEE ACKNOWLEDGEMENT:
I, {employee_name}, acknowledge receipt of this formal written warning. I understand the seriousness of the issues raised and the consequences of further violations.

Employee Signature: _______________ Date: _______________`},

  {id:"int",name:"Internship Certificate",abbr:"INT",color:"#06B6D4",body:`INTERNSHIP COMPLETION CERTIFICATE

Date: {current_date}

TO WHOM IT MAY CONCERN

This is to certify that {employee_name} has successfully completed an internship program at {company_name} during the period from {joining_date} to {last_working_date}.

INTERNSHIP DETAILS:
- Department: {department}
- Duration: {joining_date} to {last_working_date}
- Mentor / Supervisor: {reporting_manager}

During the internship, {employee_name} was actively involved in the day-to-day operations of the {department} department and contributed meaningfully to various projects and assignments. {he_she} demonstrated the following qualities:

- Strong willingness to learn and adapt to new challenges
- Good analytical and problem-solving abilities
- Effective communication and teamwork skills
- Ability to meet deadlines and deliver quality work
- Professional conduct and positive attitude

{employee_name} was a pleasure to work with, and {his_her} enthusiasm and dedication were appreciated by the entire team. The internship provided {employee_name} with practical exposure to industry practices and professional work environments.

We are confident that the experience gained during this internship will be valuable to {employee_name} in {his_her} future academic and professional pursuits.

We wish {employee_name} all the very best for {his_her} future endeavors.

For {company_name},


{authorized_name}
{authorized_designation}
{company_name}
{company_address}

Note: This certificate is issued upon request for academic and professional purposes.`},
];

function replVars(t:string,v:Record<string,string>){let r=t;Object.entries(v).forEach(([k,val])=>{r=r.replace(new RegExp(`\\{${k}\\}`,"g"),val||`{${k}}`)});return r;}

// ══════════════════════════════════════════════════════════════════════════════
export default function LettersPage(){
  const sb=useSB();
  const[loading,setLoading]=useState(true);
  const[emps,setEmps]=useState<Emp[]>([]);
  const[org,setOrg]=useState<Org>({name:"",address:"",city:"",state:"",pincode:"",phone:"",email:"",website:"",logo_url:"",gstin:""});
  const[tpl,setTpl]=useState(TPLS[0]);
  const[eid,setEid]=useState("");
  const[mode,setMode]=useState<"edit"|"preview"|"split">("split");
  const[fs,setFs]=useState(false);
  const[body,setBody]=useState(TPLS[0].body);
  const[cv,setCv]=useState<Record<string,string>>({});
  const[gen,setGen]=useState<"m"|"f">("m");
  const[cur,setCur]=useState("INR");
  const[toast,setToast]=useState("");

  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),2500);return()=>clearTimeout(t)}},[toast]);

  // Fetch
  useEffect(()=>{(async()=>{
    const oid=await getOrgId(sb);if(!oid){setLoading(false);return}
    const{data:od}=await sb.from("organizations").select("*").eq("id",oid).maybeSingle();
    if(od)setOrg({name:od.name||"",address:od.address||"",city:od.city||"",state:od.state||"",pincode:od.pincode||"",phone:od.phone||"",email:od.email||"",website:od.website||"",logo_url:od.logo_url||"",gstin:od.gstin||""});
    let list:Emp[]=[];
    // 1. employees table
    try{
      const{data:e1,error:er1}=await sb.from("employees").select("*").eq("org_id",oid);
      console.log("[Letters] employees:",e1?.length||0,er1?.message||"ok");
      if(e1&&e1.length>0)list=e1.map((e:any)=>({id:e.id,full_name:e.full_name||e.name||"",email:e.email||"",department:e.department||null,designation:e.designation||null,date_of_joining:e.date_of_joining||e.joining_date||e.created_at||null,joining_date:e.joining_date||e.date_of_joining||e.created_at||null,employee_code:e.employee_code||null}));
    }catch(x:any){console.log("[Letters] employees err:",x?.message)}
    // 2. users table + org
    if(list.length===0){try{
      const{data:e2,error:er2}=await sb.from("users").select("*").eq("org_id",oid);
      console.log("[Letters] users+org:",e2?.length||0,er2?.message||"ok");
      if(e2&&e2.length>0)list=e2.map((u:any)=>({id:u.id,full_name:u.full_name||u.name||u.email?.split("@")[0]||"User",email:u.email||"",department:u.role||u.department||null,designation:u.designation||null,date_of_joining:u.created_at||null,joining_date:u.created_at||null,employee_code:null}));
    }catch(x:any){console.log("[Letters] users+org err:",x?.message)}}
    // 3. ALL users (last resort)
    if(list.length===0){try{
      const{data:e3}=await sb.from("users").select("*");
      console.log("[Letters] all users:",e3?.length||0);
      if(e3&&e3.length>0)list=e3.map((u:any)=>({id:u.id,full_name:u.full_name||u.name||u.email?.split("@")[0]||"User",email:u.email||"",department:u.role||null,designation:null,date_of_joining:u.created_at||null,joining_date:u.created_at||null,employee_code:null}));
    }catch{}}
    console.log("[Letters] FINAL:",list.length,"people loaded");
    setEmps(list);setLoading(false);
  })()},[sb]);

  const emp=emps.find(e=>e.id===eid);
  const ctc=Number(cv.ctc_annual||0);
  const curSym=CURRS.find(c=>c.code===cur)?.sym||"₹";

  // Build vars — only name auto-filled
  const vars=useMemo(():Record<string,string>=>{
    const v=(k:string)=>cv[k]||`{${k}}`;
    return{
      employee_name:cv.employee_name||emp?.full_name||"{employee_name}",
      employee_code:v("employee_code"),employee_address:v("employee_address"),
      designation:v("designation"),department:v("department"),
      joining_date:cv.joining_date?fmtD(cv.joining_date):"{joining_date}",
      last_working_date:cv.last_working_date?fmtD(cv.last_working_date):"{last_working_date}",
      resignation_date:cv.resignation_date?fmtD(cv.resignation_date):"{resignation_date}",
      current_date:todayF(),year:new Date().getFullYear().toString(),
      company_name:org.name||"{company_name}",
      company_address:[org.address,org.city,org.state,org.pincode].filter(Boolean).join(", ")||"{company_address}",
      company_phone:org.phone||"{company_phone}",
      company_email:org.email||"{company_email}",
      he_she:gen==="m"?"He":"She",his_her:gen==="m"?"his":"her",
      authorized_name:v("authorized_name"),authorized_designation:v("authorized_designation"),
      reporting_manager:cv.reporting_manager?(emps.find(e=>e.id===cv.reporting_manager)?.full_name||cv.reporting_manager):"{reporting_manager}",
      ctc_formatted:ctc>0?`${curSym}${ctc.toLocaleString("en-IN")}`:"{ctc_formatted}",
      ctc_words:ctc>0?numToWords(ctc)+" only":"{ctc_words}",
      monthly_gross:ctc>0?`${curSym}${Math.round(ctc/12).toLocaleString("en-IN")}`:v("monthly_gross"),
      warning_reason:v("warning_reason"),
      verbal_warning_date:cv.verbal_warning_date?fmtD(cv.verbal_warning_date):"{verbal_warning_date}",
      issue_1:v("issue_1"),issue_2:v("issue_2"),
    };
  },[emp,org,gen,cv,ctc,curSym,emps]);

  const rendered=useMemo(()=>replVars(body,vars),[body,vars]);

  // Dynamic fields from current template
  const tplVars=useMemo(()=>{
    const skip=new Set(["current_date","year","company_name","company_address","company_phone","company_email","he_she","his_her","ctc_formatted","ctc_words","monthly_gross"]);
    return[...new Set((body.match(/\{[a-z_]+\}/g)||[]).map(m=>m.slice(1,-1)))].filter(v=>!skip.has(v));
  },[body]);

  const selTpl=(t:Tpl)=>{setTpl(t);setBody(t.body);setCv({})};

  const printLetter=()=>{const w=window.open("","_blank");if(!w)return;w.document.write(`<!DOCTYPE html><html><head><title>${tpl.name}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');body{font-family:'Inter',sans-serif;margin:50px 70px;color:#1a1a1a;line-height:1.9;font-size:14px}.hdr{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e5e7eb}.logo{width:48px;height:48px;border-radius:10px;object-fit:cover}.cn{font-size:18px;font-weight:700}.cd{font-size:11px;color:#666}.body{white-space:pre-wrap}@media print{body{margin:30px 50px}}</style></head><body><div class="hdr">${org.logo_url?`<img src="${org.logo_url}" class="logo"/>`:""}
<div><div class="cn">${org.name}</div><div class="cd">${[org.address,org.city,org.state,org.pincode].filter(Boolean).join(", ")}</div></div></div><div class="body">${rendered}</div></body></html>`);w.document.close();setTimeout(()=>w.print(),500)};

  if(loading)return<div className="flex items-center justify-center h-full py-20"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin"/></div>;

  // ── Render field by variable name ──
  const renderField=(v:string)=>{
    const filled=vars[v]&&!vars[v].startsWith("{");
    if(v.includes("date")&&v!=="current_date")return<DP key={v} label={v.replace(/_/g," ")} value={cv[v]||""} onChange={val=>setCv(p=>({...p,[v]:val}))}/>;
    if(v==="reporting_manager")return<div key={v}><label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Reporting manager</label><SS value={cv.reporting_manager||""} onChange={val=>setCv(p=>({...p,reporting_manager:val}))} options={emps.map(e=>({value:e.id,label:e.full_name,sub:e.email}))} placeholder="Select manager"/></div>;
    if(v==="ctc_annual"||v==="ctc_formatted")return<div key={v}><label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Annual CTC</label><CTCInput value={cv.ctc_annual||""} onChange={val=>setCv(p=>({...p,ctc_annual:val}))} currency={cur} onCurrencyChange={setCur}/></div>;
    if(v==="ctc_words"||v==="monthly_gross")return null;
    return(<div key={v}><label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide flex items-center gap-1">{filled&&<CheckCircle2 className="w-3 h-3 text-emerald-500"/>}{v.replace(/_/g," ")}</label>
      <input value={cv[v]||""} onChange={e=>setCv(p=>({...p,[v]:e.target.value}))} placeholder={v.replace(/_/g," ")}
        className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm hover:border-indigo-300 transition ${filled?"border-emerald-200":"border-gray-200"}`}/></div>);
  };

  // ── Preview ──
  const Preview=()=>(<div className="bg-white rounded-xl shadow-lg max-w-[700px] mx-auto p-10 border border-gray-200">
    <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-gray-200">
      {org.logo_url?<img src={org.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover"/>:<div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">{(org.name||"C")[0]}</div>}
      <div><p className="text-lg font-bold text-gray-900">{org.name}</p><p className="text-xs text-gray-500">{[org.address,org.city,org.state].filter(Boolean).join(", ")}</p></div>
    </div>
    <div className="whitespace-pre-wrap text-sm text-gray-800 leading-7">{rendered.split("\n").map((ln,i)=>(<div key={i} className={ln.trim()===""?"h-4":""}>{ln.split(/(\{[a-z_]+\})/g).map((p,j)=>p.match(/^\{[a-z_]+\}$/)?<span key={j} className="bg-amber-100 text-amber-700 px-1 rounded text-xs font-mono">{p}</span>:<span key={j}>{p}</span>)}</div>))}</div>
  </div>);

  // ── Sidebar fields panel ──
  const FieldsPanel=({compact}:{compact?:boolean})=>(<div className={`space-y-3 ${compact?"":"p-4"}`}>
    <div><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Template</p><div className={`grid ${compact?"grid-cols-3":"grid-cols-2"} gap-1.5`}>{TPLS.map(t=>(<button key={t.id} onClick={()=>selTpl(t)} className={`p-2 rounded-xl border text-center transition ${tpl.id===t.id?"border-indigo-300 bg-indigo-50 shadow-sm":"border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}><div className="w-6 h-6 rounded-lg mx-auto mb-1 flex items-center justify-center text-[8px] font-bold text-white shadow-sm" style={{backgroundColor:t.color}}>{t.abbr}</div><p className="text-[9px] font-semibold text-gray-700 leading-tight">{t.name}</p></button>))}</div></div>
    <div><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Employee</p><SS value={eid} onChange={setEid} options={emps.map(e=>({value:e.id,label:e.full_name,sub:e.email}))} placeholder="Select employee"/></div>
    <div><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Pronoun</p><div className="flex gap-1.5">{(["m","f"] as const).map(g=>(<button key={g} onClick={()=>setGen(g)} className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition shadow-sm ${gen===g?"bg-indigo-600 text-white border-indigo-600":"border-gray-200 text-gray-600 hover:border-gray-300"}`}>{g==="m"?"He / His":"She / Her"}</button>))}</div></div>
    {tplVars.length>0&&<div><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Fields <span className="text-gray-400 normal-case">({tplVars.length})</span></p><div className="space-y-2.5">{tplVars.map(v=>renderField(v))}</div></div>}
  </div>);

  // ── SPLIT VIEW ──
  if(mode==="split"){return(
    <div className="flex flex-col h-[calc(100vh-40px)] -m-5">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-md flex items-center justify-center text-[7px] font-bold text-white" style={{backgroundColor:tpl.color}}>{tpl.abbr}</div><span className="text-sm font-bold text-gray-900">{tpl.name}</span>{emp&&<span className="text-xs text-gray-400">— {emp.full_name}</span>}</div>
        <div className="flex items-center gap-1">{[{fn:()=>{navigator.clipboard.writeText(rendered);setToast("Copied")},ic:<Copy className="w-3.5 h-3.5 text-gray-400"/>},{fn:printLetter,ic:<Printer className="w-3.5 h-3.5 text-gray-400"/>}].map((b,i)=>(<button key={i} onClick={b.fn} className="p-1.5 hover:bg-gray-100 rounded-lg">{b.ic}</button>))}
          <button onClick={()=>setMode("edit")} className="ml-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Edit2 className="w-3 h-3"/>Edit</button>
          <button onClick={()=>setMode("preview")} className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Eye className="w-3 h-3"/>Preview</button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[310px] flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto p-3"><FieldsPanel compact/></div>
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50"><Preview/></div>
      </div>
      {toast&&<div className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5"/>{toast}</div>}
    </div>
  );}

  // ── EDIT / PREVIEW VIEW ──
  return(
    <div className={fs?"fixed inset-0 z-50 bg-gray-50 p-4 overflow-auto":"max-w-7xl mx-auto"}>
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-xl font-bold text-gray-900">HR Letters</h1><p className="text-sm text-gray-400">Generate and customize HR documents</p></div>
        <div className="flex items-center gap-1.5">
          <div className="flex bg-gray-100 p-0.5 rounded-lg">{([{id:"edit" as const,ic:<Edit2 className="w-3 h-3"/>,l:"Edit"},{id:"split" as const,ic:<PanelLeft className="w-3 h-3"/>,l:"Split"},{id:"preview" as const,ic:<Eye className="w-3 h-3"/>,l:"Preview"}]).map(m=>(<button key={m.id} onClick={()=>setMode(m.id)} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition ${mode===m.id?"bg-white text-gray-900 shadow-sm":"text-gray-500"}`}>{m.ic}{m.l}</button>))}</div>
          <button onClick={()=>{navigator.clipboard.writeText(rendered);setToast("Copied")}} className="p-2 hover:bg-gray-100 rounded-lg"><Copy className="w-4 h-4 text-gray-400"/></button>
          <button onClick={printLetter} className="p-2 hover:bg-gray-100 rounded-lg"><Printer className="w-4 h-4 text-gray-400"/></button>
          <button onClick={()=>setFs(!fs)} className="p-2 hover:bg-gray-100 rounded-lg">{fs?<Minimize2 className="w-4 h-4 text-gray-400"/>:<Maximize2 className="w-4 h-4 text-gray-400"/>}</button>
          <button onClick={()=>{setBody(tpl.body);setCv({});setToast("Reset")}} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-400"/></button>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        {mode==="edit"&&<div className="lg:col-span-4"><div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"><FieldsPanel/></div></div>}
        {mode==="edit"&&<div className="lg:col-span-8"><div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><textarea value={body} onChange={e=>setBody(e.target.value)} rows={28} className="w-full px-4 py-4 border border-gray-200 rounded-xl text-sm leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none bg-gray-50"/><p className="text-[10px] text-gray-400 mt-2 text-right">{body.split(/\s+/).filter(Boolean).length} words</p></div></div>}
        {mode==="preview"&&<div className="lg:col-span-12"><div className="bg-gray-100 rounded-2xl p-6 min-h-[600px]"><Preview/></div></div>}
      </div>
      {toast&&<div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800"><CheckCircle2 className="w-4 h-4"/>{toast}</div>}
    </div>
  );
}