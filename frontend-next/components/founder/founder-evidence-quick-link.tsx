import Link from 'next/link'
import { FileCheck } from 'lucide-react'

type Props = {
  className?: string
  label?: string
}

export function FounderEvidenceQuickLink({
  className = 'inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200',
  label = 'Open Evidence Engine →'
}: Props) {
  return (
    <Link href="/founder/evidence" className={className}>
      <FileCheck className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  )
}
