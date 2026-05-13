'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CheckCircle2, Keyboard, Lock, Mic, ShieldCheck, Sparkles, Volume2 } from 'lucide-react'

import { OrbVisual } from './orb-visual'
import { OrbRuntimeController } from '@/lib/orb/state'
import type { OrbPreferences, OrbVoiceProfile } from '@/lib/orb/types'
import { defaultOrbPreferences, defaultOrbVoiceProfile } from '@/lib/orb/types'

const setupPhrases = [
  'Hey IndiCare, start my shift.',
  'Hey IndiCare, create a daily note.',
  'Hey IndiCare, summarise Jamie\'s chronology.',
  'Hey IndiCare, what needs manager review?'
]

export function OrbSetup({ compact = false }: { compact?: boolean }) {
  const controller = useMemo(() => new OrbRuntimeController(), [])
  const [microphone, setMicrophone] = useState<string>('unknown')
  const [preferences, setPreferences] = useState<OrbPreferences>(defaultOrbPreferences)
  const [voiceProfile, setVoiceProfile] = useState<OrbVoiceProfile>(defaultOrbVoiceProfile)
  const [saved, setSaved] = useState(false)

  async function requestMicrophone() {
    const granted = await controller.requestMicrophone()
    setMicrophone(granted ? 'granted' : controller.getSnapshot().microphone)
  }

  function updatePreference<K extends keyof OrbPreferences>(key: K, value: OrbPreferences[K]) {
    setSaved(false)
    setPreferences((current) => ({ ...current, [key]: value }))
  }

  function save() {
    controller.updatePreferences(preferences)
    setSaved(true)
  }

  return (
    <div className={compact ? 'space-y-5' : 'mx-auto max-w-5xl space-y-6'}>
      <section className="rounded-[32px] border border-white/70 bg-gradient-to-br from-white to-blue-50 p-6 shadow-xl shadow-slate-950/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Orb setup</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">Set up Orb powered by IndiCare</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Orb is the calm voice and presence layer for IndiCare OS. It uses the existing assistant core, RBAC, retrieval and citations. Raw audio is not stored by default.
            </p>
          </div>
          <OrbVisual state={microphone === 'granted' ? 'listening' : 'idle'} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-blue-600" aria-hidden />
            <h2 className="text-xl font-black text-slate-950">1. Privacy and safety</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Orb cites records and says when there is not enough evidence.</li>
            <li>Orb drafts before writing and asks before saving records/actions.</li>
            <li>Safeguarding-sensitive prompts are handled with caution and manager escalation prompts.</li>
          </ul>
          <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            Do not store transcript for new sessions
            <input
              type="checkbox"
              checked={preferences.do_not_store_transcript}
              onChange={(event) => updatePreference('do_not_store_transcript', event.target.checked)}
              className="h-5 w-5"
            />
          </label>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-blue-600" aria-hidden />
            <h2 className="text-xl font-black text-slate-950">2. Microphone permission</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Grant microphone access for press-to-talk and dictation foundations.</p>
          <button
            type="button"
            onClick={() => void requestMicrophone()}
            className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
          >
            {microphone === 'granted' ? 'Microphone granted' : 'Grant microphone'}
          </button>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-blue-600" aria-hidden />
            <h2 className="text-xl font-black text-slate-950">3. Voice profile</h2>
          </div>
          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            Default: {voiceProfile.name}, British accent, calm/warm/professional, medium speed. Synthetic provider voices only; Orb does not clone real people.
          </div>
          <label className="mt-4 block text-sm font-black text-slate-700">
            Style
            <select
              value={voiceProfile.voice_style || 'standard'}
              onChange={(event) => setVoiceProfile((current) => ({ ...current, voice_style: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
            >
              <option value="standard">Calm operational support</option>
              <option value="concise">Concise</option>
              <option value="inspection">Inspection-ready</option>
              <option value="quiet">Quiet mode</option>
            </select>
          </label>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <Keyboard className="h-5 w-5 text-blue-600" aria-hidden />
            <h2 className="text-xl font-black text-slate-950">4. Activation</h2>
          </div>
          <div className="mt-4 space-y-3">
            {([
              ['press_to_talk', 'Press-to-talk'],
              ['hey_indicare_placeholder', '"Hey IndiCare" foundation placeholder'],
              ['keyboard_shortcut', 'Keyboard shortcut']
            ] as const).map(([value, label]) => (
              <label key={value} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                {label}
                <input
                  type="radio"
                  name="activation"
                  checked={preferences.activation_mode === value}
                  onChange={() => updatePreference('activation_mode', value)}
                />
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-xl font-black text-slate-950">5. Test phrases</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {setupPhrases.map((phrase) => (
            <div key={phrase} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700">{phrase}</div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-xl font-black text-slate-950">6. Preferences</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {([
            ['concise_answers', 'Concise answers'],
            ['read_citations_aloud', 'Read citations aloud'],
            ['confirm_before_writing_records', 'Confirm before writing records'],
            ['safeguarding_sensitive_mode', 'Safeguarding-sensitive mode']
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              {label}
              <input
                type="checkbox"
                checked={Boolean(preferences[key])}
                onChange={(event) => updatePreference(key, event.target.checked)}
                className="h-5 w-5"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={save} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Save Orb preferences
          </button>
          <Link href="/settings/orb" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">
            Back to Orb settings
          </Link>
          {saved ? <span className="inline-flex items-center rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"><CheckCircle2 className="mr-2 h-4 w-4" aria-hidden /> Saved locally</span> : null}
        </div>
      </section>
    </div>
  )
}

