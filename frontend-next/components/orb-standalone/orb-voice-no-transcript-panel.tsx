'use client'

export function OrbVoiceNoTranscriptPanel({
  headline = 'No speech was captured.',
  detail = 'Try again, use Dictate, or use Chat.',
  onTryAgain,
  onOpenDictate,
  onUseChat,
  className = ''
}: {
  headline?: string
  detail?: string
  onTryAgain: () => void
  onOpenDictate?: () => void
  onUseChat: () => void
  className?: string
}) {
  return (
    <section
      className={`orb-voice-no-transcript w-full space-y-4 text-center ${className}`.trim()}
      data-orb-voice-no-transcript
      role="status"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--orb-foreground)]">{headline}</p>
        <p className="text-xs leading-5 text-[var(--orb-muted)]">{detail}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] px-4 py-2.5 text-sm font-semibold text-white"
          data-orb-voice-try-again
        >
          Try again
        </button>
        {onOpenDictate ? (
          <button
            type="button"
            onClick={onOpenDictate}
            className="rounded-full border border-[var(--orb-line)] px-4 py-2.5 text-sm font-medium text-[var(--orb-foreground)]"
            data-orb-voice-open-dictate
          >
            Open Dictate
          </button>
        ) : null}
        <button
          type="button"
          onClick={onUseChat}
          className="rounded-full border border-[var(--orb-line)] px-4 py-2.5 text-sm font-medium text-[var(--orb-foreground)]"
          data-orb-voice-use-chat
        >
          Use Chat
        </button>
      </div>
    </section>
  )
}
