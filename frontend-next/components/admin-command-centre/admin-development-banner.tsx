'use client'

import { AlertTriangle } from 'lucide-react'

import { ADMIN_MODE_LABELS } from '@/lib/admin-command-centre/admin-data-mode'

export function AdminDevelopmentBanner() {
  return (
    <div
      className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 backdrop-blur-sm"
      role="status"
      data-testid="admin-development-banner"
    >
      <div className="flex flex-wrap items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <p className="text-sm text-slate-300">
          <span className="font-bold text-amber-200">{ADMIN_MODE_LABELS.development}</span>
          {' · '}
          {ADMIN_MODE_LABELS.placeholder}
          {' · '}
          {ADMIN_MODE_LABELS.notLive}
        </p>
      </div>
    </div>
  )
}
