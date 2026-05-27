export function LifeEchoMemoryCard({ memory }: { memory: Record<string, unknown> }) {
  return (
    <article data-testid="lifeecho-memory-card" className="rounded-[24px] border border-violet-100 bg-violet-50/40 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">
        {String(memory.kind || 'memory')} · {String(memory.status || 'approved')}
      </p>
      <h3 className="mt-2 text-lg font-black text-slate-950">{String(memory.title || 'Memory')}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{String(memory.safe_summary || '')}</p>
    </article>
  )
}
