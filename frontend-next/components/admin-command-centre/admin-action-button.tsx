'use client'

import { getAdminAction } from '@/lib/admin-command-centre/admin-actions'
import type { AdminActionKind } from '@/lib/admin-command-centre/types'

export function AdminActionButton({
  kind,
  onClick,
  disabled,
  wired,
  disabledReason,
  label
}: {
  kind: AdminActionKind
  onClick?: () => void
  disabled?: boolean
  wired?: boolean
  disabledReason?: string
  label?: string
}) {
  const action = getAdminAction(kind)
  const isWired = wired ?? action.wired
  const isDisabled = disabled || !isWired
  const title = disabledReason || action.description || (isWired ? undefined : 'Not wired to current auth provider yet')

  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      title={title}
      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04] disabled:hover:text-slate-300"
    >
      {label ?? action.label}
      {!isWired ? (
        <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
          · not wired yet
        </span>
      ) : null}
    </button>
  )
}

export function AdminTableShell({
  headers,
  children,
  emptyMessage
}: {
  headers: string[]
  children: React.ReactNode
  emptyMessage?: string
}) {
  const childArray = Array.isArray(children) ? children : children ? [children] : []
  const isEmpty = childArray.length === 0

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage ?? 'No records'}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

export function formatAdminDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}
