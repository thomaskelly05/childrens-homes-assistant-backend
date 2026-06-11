import Link from 'next/link'

import { buildOrbRetentionStatusItems } from '@/lib/orb/privacy/orb-privacy-content'

export function OrbRetentionStatusCard({ className = '' }: { className?: string }) {
  const items = buildOrbRetentionStatusItems()

  return (
    <section
      className={`rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-4 ${className}`.trim()}
      data-orb-retention-status-card
    >
      <h2 className="text-sm font-bold text-[var(--orb-foreground)]">Retention status</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--orb-muted)]">
        Honest status for closed pilot. Retention controls are being finalised where noted.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-[var(--orb-line)]/40 px-3 py-2.5"
            data-orb-retention-item={item.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--orb-foreground)]">{item.label}</span>
              <span
                className="rounded-full border border-[var(--orb-line)] px-2 py-0.5 text-[10px] font-medium text-[var(--orb-muted)]"
                data-orb-retention-status={item.status}
              >
                {item.status}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[var(--orb-muted)]">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-5 text-[var(--orb-muted)]">
        Deletion and export requests:{' '}
        <Link href="/orb/privacy/requests" className="font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
          Privacy requests
        </Link>
      </p>
    </section>
  )
}
