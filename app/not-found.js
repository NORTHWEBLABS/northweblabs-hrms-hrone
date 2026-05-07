import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-5xl text-center relative">

        {/* Huge 404 */}
        <h1 className="text-[140px] md:text-[260px] font-black leading-none tracking-[-0.08em] text-[#0f172a]/[0.06] select-none">
          404
        </h1>

        {/* Card */}
        <div className="relative -mt-8 md:-mt-16 mx-auto max-w-2xl bg-white border border-slate-200 rounded-[32px] p-8 md:p-12 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">

          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6">
            <ShieldAlert
              className="text-blue-600"
              size={30}
              strokeWidth={2.2}
            />
          </div>

          {/* Heading */}
          <h2 className="text-3xl md:text-5xl font-bold text-[#0f172a] tracking-tight">
            Page not found
          </h2>

          {/* Description */}
          <p className="mt-5 text-slate-500 text-lg leading-relaxed max-w-xl mx-auto">
            The page you are trying to access does not exist or may have been moved.
          </p>

          {/* Button */}
          <div className="mt-10">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#0f172a] hover:bg-[#111c35] text-white font-medium transition-all duration-200 shadow-lg shadow-slate-200"
            >
              Go to Dashboard
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}