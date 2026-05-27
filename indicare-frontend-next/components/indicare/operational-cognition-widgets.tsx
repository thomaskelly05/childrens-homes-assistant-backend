'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

type Tone = 'blue' | 'emerald' | 'amber' | 'slate' | 'purple'

export type OperationalSignal = {
  label: string
  value: string | number
  detail?: string
  tone?: Tone
}

export type TrendPoint = {
  label: string
  value: number
  secondary?: number
}

type MeasuredChartProps = {
  className?: string
  minHeight?: number
  minWidth?: number
  children: (size: { width: number; height: number }) => ReactNode
}

const toneClasses: Record<Tone, string> = {
  blue: 'border-blue-100 bg-blue-50/80 text-blue-950 shadow-blue-500/10',
  emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-950 shadow-emerald-500/10',
  amber: 'border-amber-100 bg-amber-50/80 text-amber-950 shadow-amber-500/10',
  slate: 'border-slate-100 bg-slate-50/90 text-slate-950 shadow-slate-500/10',
  purple: 'border-purple-100 bg-purple-50/80 text-purple-950 shadow-purple-500/10'
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function MeasuredChart({ className, minHeight = 144, minWidth = 120, children }: MeasuredChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      const rect = node.getBoundingClientRect()
      const width = Math.max(Math.floor(rect.width), minWidth)
      const height = Math.max(Math.floor(rect.height), minHeight)
      if (width > 0 && height > 0) {
        setSize((current) => (current?.width === width && current?.height === height ? current : { width, height }))
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [minHeight, minWidth])

  return (
    <div ref={containerRef} className={className} style={{ minHeight, minWidth, width: '100%' }} data-chart-ready={size ? 'true' : 'false'}>
      {size ? children(size) : null}
    </div>
  )
}

export function OperationalSignalGrid({ signals }: { signals: OperationalSignal[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {signals.map((signal, index) => (
        <motion.article
          key={`${signal.label}-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.035, duration: 0.22 }}
          className={`rounded-[28px] border p-5 shadow-lg backdrop-blur ${toneClasses[signal.tone || 'slate']}`}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-65">{signal.label}</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.06em]">{signal.value}</p>
          {signal.detail ? <p className="mt-2 text-sm font-bold leading-6 opacity-70">{signal.detail}</p> : null}
        </motion.article>
      ))}
    </div>
  )
}

export function WellbeingRing({ label, value, detail, tone = 'blue' }: { label: string; value: number; detail?: string; tone?: Tone }) {
  const safeValue = clampPercent(value)
  const color = tone === 'emerald' ? '#10b981' : tone === 'amber' ? '#f59e0b' : tone === 'purple' ? '#8b5cf6' : '#2563eb'

  return (
    <article className={`rounded-[30px] border p-5 shadow-lg backdrop-blur ${toneClasses[tone]}`}>
      <MeasuredChart className="h-36 w-full min-h-[9rem] min-w-[7.5rem]" minHeight={144} minWidth={120}>
        {({ width, height }) => (
          <ResponsiveContainer width={width} height={height}>
            <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: label, value: safeValue, fill: color }]} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={16} background={{ fill: 'rgba(148,163,184,0.16)' }} />
            </RadialBarChart>
          </ResponsiveContainer>
        )}
      </MeasuredChart>
      <div className="-mt-24 flex h-24 flex-col items-center justify-center text-center">
        <strong className="text-3xl font-black tracking-[-0.06em]">{safeValue}%</strong>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">{label}</span>
      </div>
      {detail ? <p className="mt-5 text-center text-sm font-bold leading-6 opacity-70">{detail}</p> : null}
    </article>
  )
}

export function OperationalTrendChart({ title, description, data }: { title: string; description?: string; data: TrendPoint[] }) {
  return (
    <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Trajectory</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
        {description ? <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{description}</p> : null}
      </div>
      <MeasuredChart className="h-72 w-full min-h-[18rem] min-w-[12rem]" minHeight={288} minWidth={192}>
        {({ width, height }) => (
          <ResponsiveContainer width={width} height={height}>
            <AreaChart data={data} margin={{ left: -18, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="blueSignal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 18, border: '1px solid rgba(148,163,184,0.22)', boxShadow: '0 18px 48px rgba(15,23,42,0.12)' }} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fill="url(#blueSignal)" />
              <Area type="monotone" dataKey="secondary" stroke="#8b5cf6" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </MeasuredChart>
    </section>
  )
}

export function OperationalBarChart({ title, data }: { title: string; data: TrendPoint[] }) {
  return (
    <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_54px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Operational pressure</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
      <MeasuredChart className="mt-5 h-64 w-full min-h-[16rem] min-w-[12rem]" minHeight={256} minWidth={192}>
        {({ width, height }) => (
          <ResponsiveContainer width={width} height={height}>
            <BarChart data={data} margin={{ left: -18, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 18, border: '1px solid rgba(148,163,184,0.22)' }} />
              <Bar dataKey="value" fill="#2563eb" radius={[12, 12, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </MeasuredChart>
    </section>
  )
}

export function CognitionPromptStack({ title, prompts, action }: { title: string; prompts: string[]; action?: ReactNode }) {
  return (
    <section className="rounded-[32px] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">Reflective cognition</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5 grid gap-3">
        {prompts.map((prompt) => (
          <div key={prompt} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-bold leading-6 text-blue-50">
            {prompt}
          </div>
        ))}
      </div>
    </section>
  )
}
