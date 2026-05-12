export function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-[32px] border border-red-100 bg-red-50/70 p-8 shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500">
        Operational issue
      </p>

      <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-red-900">
        Workspace recovery required
      </h3>

      <p className="mt-4 max-w-2xl text-sm leading-7 text-red-800">
        {message}
      </p>
    </section>
  )
}
