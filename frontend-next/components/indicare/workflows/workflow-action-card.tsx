import Link from 'next/link'

export function WorkflowActionCard({
  title,
  description,
  href,
  tone = 'slate',
  meta
}: {
  title: string
  description: string
  href: string
  tone?: 'slate' | 'blue' | 'amber' | 'red' | 'emerald'
  meta?: string
}) {
  const tones = {
    slate: 'border-slate-100 bg-slate-50 text-slate-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
    red: 'border-red-100 bg-red-50 text-red-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800'
  }

  return (
    <Link href={href} className={`block rounded-[24px] border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${tones[tone]}`}>
      {meta ? <span className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">{meta}</span> : null}
      <h3 className="mt-2 text-lg font-black tracking-[-0.03em]">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 opacity-85">{description}</p>
    </Link>
  )
}
