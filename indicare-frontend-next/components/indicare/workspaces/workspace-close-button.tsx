'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function WorkspaceCloseButton({
  href,
  label = 'Close workspace'
}: {
  href: string
  label?: string
}) {
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        router.push(href)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [href, router])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => router.back()}
        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        Back
      </button>
      <Link
        href={href}
        className="inline-flex items-center rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        <X className="mr-2 h-4 w-4" aria-hidden />
        {label}
      </Link>
    </div>
  )
}
