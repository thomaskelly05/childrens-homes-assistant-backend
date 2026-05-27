export function OsEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div
      data-testid="os-empty-state"
      className="rounded-[24px] border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center"
    >
      <p className="text-base font-black text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">{description}</p>
    </div>
  )
}
