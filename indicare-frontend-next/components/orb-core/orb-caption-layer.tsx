export function OrbCaptionLayer({ enabled, text, privacySensitive = false }: { enabled?: boolean; text?: string; privacySensitive?: boolean }) {
  if (!enabled) return null
  return (
    <div className="orb-caption-surface w-full max-w-xl px-5 py-4 text-center text-sm font-semibold leading-6 text-slate-50" aria-live="polite">
      {privacySensitive && text ? 'Sensitive captions hidden until confirmed.' : text || 'Captions will appear here.'}
    </div>
  )
}

