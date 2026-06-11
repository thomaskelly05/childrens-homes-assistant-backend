'use client'

import { getOrbClassificationForInput } from '@/lib/orb/privacy/orb-data-classification'

/** Shows guidance when obvious RED or AMBER patterns are detected in user input. */
export function OrbPrivacyInputWarning({ text }: { text: string }) {
  const assessment = getOrbClassificationForInput(text)
  if (!assessment.shouldWarn) return null

  const tone =
    assessment.level === 'red'
      ? 'border-rose-300/50 bg-rose-500/10 text-rose-100'
      : 'border-amber-300/50 bg-amber-500/10 text-amber-100'

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-[11px] leading-5 ${tone}`}
      role="status"
      data-orb-privacy-input-warning
      data-orb-classification-level={assessment.level}
    >
      <p className="font-semibold" data-orb-privacy-warning-guidance>
        {assessment.guidance}
      </p>
      {assessment.warnings.length ? (
        <ul className="mt-1 list-disc pl-4 opacity-90">
          {assessment.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
