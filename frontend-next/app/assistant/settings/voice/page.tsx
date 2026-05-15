import { OrbRenderer } from '@/components/orb-core/orb-renderer'
import { OrbStandaloneShell } from '@/components/orb-standalone/orb-standalone-shell'
import { planOrbVoiceRoute } from '@/lib/orb/voice/orchestration'
import { prosodyForOrbVoice } from '@/lib/orb/voice/prosody'

export default function AssistantVoiceSettingsPage() {
  const route = planOrbVoiceRoute('calm_reflective', false)
  const prosody = prosodyForOrbVoice('calm_reflective')

  return (
    <OrbStandaloneShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <OrbRenderer state="idle" caption="British female calm profile. Realtime uses ephemeral tokens only when configured." captionsEnabled />
        <section className="rounded-[36px] border border-white/10 bg-white/8 p-6 text-white backdrop-blur">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Voice settings</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">Calm British ORB voice</h2>
          <dl className="mt-6 space-y-3 text-sm leading-6">
            <div><dt className="font-black text-slate-300">Route</dt><dd>{route.providerRoute}</dd></div>
            <div><dt className="font-black text-slate-300">Fallback</dt><dd>{route.fallbackTextMode ? 'Caption/text mode' : 'Realtime voice'}</dd></div>
            <div><dt className="font-black text-slate-300">Prosody</dt><dd>{prosody.pace}, {prosody.cadence}</dd></div>
          </dl>
        </section>
      </div>
    </OrbStandaloneShell>
  )
}

