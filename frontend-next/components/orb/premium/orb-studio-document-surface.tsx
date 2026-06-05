'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioDocumentSurfaceClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioDocumentSurface({
  children,
  className,
  printPage
}: {
  children: ReactNode
  className?: string
  printPage?: boolean
}) {
  return (
    <article
      className={orbStudioClass(orbStudioDocumentSurfaceClass, printPage ? 'print:shadow-none' : undefined, className)}
      data-orb-studio-document-surface
      data-orb-write-print-page={printPage ? true : undefined}
    >
      {children}
    </article>
  )
}
