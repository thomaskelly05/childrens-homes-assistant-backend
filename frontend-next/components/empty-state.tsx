export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white/70 p-10 text-center shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
      <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-500">
        {description}
      </p>
    </section>
  )
}
