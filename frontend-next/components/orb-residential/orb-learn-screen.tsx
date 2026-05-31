'use client'

import { useState } from 'react'
import Link from 'next/link'

import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { generateOrbLearningFromAnswer } from '@/lib/orb/orb-learn-client'

const SESSION_TYPES = [
  { id: 'five_minute', label: '5-minute learning session' },
  { id: 'staff_briefing', label: 'Staff briefing' },
  { id: 'knowledge_check', label: 'Knowledge check' },
  { id: 'reflective_supervision', label: 'Reflective supervision prompt' },
  { id: 'cpd_note', label: 'CPD note' },
  { id: 'team_discussion', label: 'Team discussion' }
]

export function OrbLearnScreen() {
  const [sessionType, setSessionType] = useState(SESSION_TYPES[0]!.id)
  const [answerText, setAnswerText] = useState('')
  const [topic, setTopic] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    const text = answerText.trim() || topic.trim()
    if (!text) {
      setError('Paste an ORB answer or enter a topic.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await generateOrbLearningFromAnswer({
        answer_text: text,
        session_type: sessionType,
        topic: topic || undefined
      })
      const data = (result as { data?: Record<string, unknown> }).data ?? result
      setOutput(
        typeof data === 'object'
          ? JSON.stringify(data, null, 2)
          : String(data)
      )
    } catch {
      setError('Learning session could not be generated.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OrbShell>
      <div className="mx-auto max-w-2xl py-6" data-orb-learn>
        <Link href="/orb" className="text-xs text-slate-500 hover:text-sky-300">
          ← ORB home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-white">ORB Learn</h1>
        <p className="mt-2 text-sm text-slate-400">Micro-learning — not a course portal.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {SESSION_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSessionType(item.id)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                sessionType === item.id
                  ? 'border-sky-400/50 bg-sky-500/10 text-white'
                  : 'border-white/10 text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <OrbGlassCard className="mt-8">
          <label className="block text-sm text-slate-300">
            Topic (optional)
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white"
              placeholder="e.g. Regulation 44 visits"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Paste an ORB answer
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={8}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white"
              placeholder="Paste guidance from ORB to turn into learning…"
            />
          </label>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <OrbButton className="mt-4 w-full" onClick={() => void handleGenerate()} disabled={loading}>
            {loading ? 'Generating…' : 'Generate learning'}
          </OrbButton>
        </OrbGlassCard>

        {output ? (
          <OrbGlassCard className="mt-6">
            <pre className="whitespace-pre-wrap text-sm text-slate-300">{output}</pre>
          </OrbGlassCard>
        ) : null}
      </div>
    </OrbShell>
  )
}
