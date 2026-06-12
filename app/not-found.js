"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowRight,
  BadgeAlert,
  Building2,
  CalendarX2,
  CircleDot,
  LayoutDashboard,
  MousePointer2,
  Sparkles,
} from "lucide-react"

const diagnostics = [
  {
    message: "Checking app route registry...",
    progress: 24,
    label: "Route registry",
  },
  {
    message: "Scanning workspace permissions...",
    progress: 48,
    label: "Workspace access",
  },
  {
    message: "Looking for matching HRMS screen...",
    progress: 72,
    label: "Screen lookup",
  },
  {
    message: "No matching page was found.",
    progress: 100,
    label: "Route missing",
  },
]

export default function NotFound() {
  const [diagnosticIndex, setDiagnosticIndex] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const diagnostic = diagnostics[diagnosticIndex]

  const nextDiagnostic = () => {
    setDiagnosticIndex((current) => (current + 1) % diagnostics.length)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-6 py-12 text-[#0F172A]">
      <section className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left */}
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            404 · Route unavailable
          </div>

          <h1 className="max-w-xl text-5xl font-black leading-tight tracking-[-0.04em] text-[#07112B] sm:text-7xl">
            Page not found in your workspace.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
            The route you opened does not exist, was moved, or is not available
            in this HRMS workspace.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-blue-200 transition hover:-translate-y-1 hover:bg-blue-700 active:scale-95"
            >
              <LayoutDashboard className="h-4 w-4" />
              Open dashboard
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>

            <button
              onClick={nextDiagnostic}
              className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:bg-slate-50 active:scale-95"
            >
              <MousePointer2 className="h-4 w-4 text-blue-600" />
              Inspect route
            </button>
          </div>

          <div className="mt-8 flex items-center gap-3 text-sm font-medium text-slate-500">
            <CircleDot className="h-4 w-4 text-blue-600" />
            Click “Inspect route” or the right card to advance the route scan.
          </div>
        </div>

        {/* Right interactive card */}
        <button
          onClick={nextDiagnostic}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top

            setTilt({
              x: (y / rect.height - 0.5) * -7,
              y: (x / rect.width - 0.5) * 7,
            })
          }}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          className="group relative w-full rounded-[40px] border border-slate-200 bg-white p-5 text-left shadow-[0_35px_100px_-45px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_45px_110px_-45px_rgba(15,23,42,0.55)] active:scale-[0.99] sm:p-7"
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        >
          <div className="rounded-[32px] bg-[#07112B] p-7 text-white sm:p-9">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-blue-300">
                  Route status
                </p>

                <h2 className="mt-3 text-5xl font-black tracking-[-0.06em] sm:text-7xl">
                  404
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 transition group-hover:rotate-6 group-hover:bg-white/15">
                <BadgeAlert className="h-7 w-7 text-blue-300" />
              </div>
            </div>

            <div className="mt-10 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <CalendarX2 className="h-5 w-5 text-blue-300" />
                <p className="text-sm font-semibold text-slate-200">
                  Route diagnostic
                </p>
              </div>

              <p className="mt-4 min-h-[56px] text-lg font-bold leading-7 text-white">
                {diagnostic.message}
              </p>
            </div>

            {/* Route scan progress */}
            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                  {diagnostic.label}
                </p>

                <p className="text-sm font-bold text-white">
                  {diagnostic.progress}%
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    diagnostic.progress === 100
                      ? "bg-orange-400"
                      : "bg-blue-400"
                  }`}
                  style={{
                    width: `${diagnostic.progress}%`,
                  }}
                />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {diagnostics.map((item, index) => {
                  const isActive = index === diagnosticIndex
                  const isDone = index <= diagnosticIndex

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setDiagnosticIndex(index)
                      }}
                      className={`h-1.5 rounded-full transition ${
                        isActive
                          ? "bg-white"
                          : isDone
                            ? "bg-blue-300/70"
                            : "bg-white/15 hover:bg-white/30"
                      }`}
                      aria-label={`Go to ${item.label}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-[#F8FAFC] p-5 transition group-hover:-translate-y-1 group-hover:bg-white">
              <Building2 className="h-6 w-6 text-blue-600" />
              <p className="mt-4 text-sm font-medium text-slate-500">
                Workspace
              </p>
              <p className="mt-1 text-xl font-black">HRMS</p>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-5 transition group-hover:-translate-y-1">
              <CalendarX2 className="h-6 w-6 text-orange-500" />
              <p className="mt-4 text-sm font-medium text-slate-500">
                Availability
              </p>
              <p className="mt-1 text-xl font-black text-orange-500">
                Missing
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-sm font-semibold text-slate-400">
            Click this card to continue the route scan
          </p>
        </button>
      </section>
    </main>
  )
}