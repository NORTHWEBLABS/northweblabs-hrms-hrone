"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowRight,
  CloudOff,
  DatabaseZap,
  LayoutDashboard,
  RefreshCcw,
  WifiOff,
} from "lucide-react"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    setChecking(true)

    setTimeout(() => {
      window.location.reload()
    }, 700)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-12 text-[#0F172A]">
      <section className="grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left */}
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow-sm">
            <WifiOff className="h-4 w-4" />
            Connection unavailable
          </div>

          <h1 className="max-w-xl text-5xl font-black leading-tight tracking-[-0.04em] text-[#07112B] sm:text-7xl">
            You’re offline right now.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
            Your HRMS workspace needs an internet connection to sync employees,
            attendance, payroll and approvals. Reconnect to continue.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              onClick={handleRefresh}
              className="group inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-blue-200 transition hover:-translate-y-1 hover:bg-blue-700 active:scale-95"
            >
              <RefreshCcw
                className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
              />
              Check connection
            </button>

            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:bg-slate-50 active:scale-95"
            >
              <LayoutDashboard className="h-4 w-4 text-blue-600" />
              Open dashboard
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-3 text-sm font-medium text-slate-500">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline ? "bg-emerald-500" : "bg-orange-500"
              }`}
            />
            {isOnline
              ? "Connection restored. Refresh the page to sync data."
              : "Waiting for network connection..."}
          </div>
        </div>

        {/* Right card */}
        <div className="w-full rounded-[40px] border border-slate-200 bg-white p-5 shadow-[0_35px_100px_-45px_rgba(15,23,42,0.45)] sm:p-7">
          <div className="rounded-[32px] bg-[#07112B] p-7 text-white sm:p-9">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-orange-300">
                  Sync status
                </p>

                <h2 className="mt-3 text-5xl font-black tracking-[-0.06em] sm:text-7xl">
                  Offline
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <CloudOff className="h-7 w-7 text-orange-300" />
              </div>
            </div>

            <div className="mt-10 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <DatabaseZap className="h-5 w-5 text-blue-300" />
                <p className="text-sm font-semibold text-slate-200">
                  Data sync paused
                </p>
              </div>

              <p className="mt-4 text-lg font-bold leading-7 text-white">
                Attendance check-ins, payroll updates and employee changes will
                sync once your connection is restored.
              </p>
            </div>

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                  Sync readiness
                </p>

                <p className="text-sm font-bold text-white">
                  {isOnline ? "Ready" : "Paused"}
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOnline ? "w-full bg-emerald-400" : "w-[28%] bg-orange-400"
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-[#F8FAFC] p-5">
              <p className="text-sm font-medium text-slate-500">
                Local status
              </p>
              <p className="mt-2 text-2xl font-black">
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-5">
              <p className="text-sm font-medium text-slate-500">
                HRMS sync
              </p>
              <p className="mt-2 text-2xl font-black text-orange-500">
                {isOnline ? "Ready" : "Paused"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}