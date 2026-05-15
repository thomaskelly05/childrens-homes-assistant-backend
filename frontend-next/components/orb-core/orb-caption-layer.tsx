export function OrbCaptionLayer({ enabled, text, privacySensitive = false }: { enabled?: boolean; text?: string; privacySensitive?: boolean }) {
  if (!enabled) return null
  return (
    <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/10 px-5 py-4 text-center text-sm leading-6 text-slate-100 backdrop-blur" aria-live="polite">
      {privacySensitive && text ? 'Sensitive captions hidden until confirmed.' : text || 'Captions will appear here.'}
    </div>
  )
}

