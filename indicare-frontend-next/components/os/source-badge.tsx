export function SourceBadge({ table, id }: { table?: string; id?: string }) {
  if (!table && !id) return null
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
      {table ? <span className="truncate">{table}</span> : null}
      {table && id ? <span className="text-slate-300">·</span> : null}
      {id ? <span className="truncate font-mono text-slate-500">{id}</span> : null}
    </span>
  )
}
