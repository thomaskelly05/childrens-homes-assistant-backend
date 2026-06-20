'use client'

import {
  ORB_HOME_START_WITH_LABEL,
  ORB_HOME_START_WITH_OPTIONS
} from '@/lib/orb/orb-residential-shell-copy'

export type OrbHomeStartRowProps = {
  onSelect: (prompt: string) => void
}

/** Calm specialist starters above the home composer — guidance, not a dashboard. */
export function OrbHomeStartRow({ onSelect }: OrbHomeStartRowProps) {
  return (
    <div
      className="orb-home-start-row mx-auto w-full max-w-[var(--orb-composer-dock-max,48rem)] px-1 pb-2"
      data-orb-home-start-with
    >
      <p className="orb-home-start-label mb-1.5 text-center text-[11px] font-medium tracking-wide text-[var(--orb-muted)]">
        {ORB_HOME_START_WITH_LABEL}
      </p>
      <div className="orb-home-start-options flex flex-wrap items-center justify-center gap-1.5">
        {ORB_HOME_START_WITH_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className="orb-home-start-option orb-workspace-starter"
            data-orb-home-start-option={option.id}
            onClick={() => onSelect(option.prompt)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
