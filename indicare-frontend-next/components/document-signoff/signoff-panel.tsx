export function DocumentSignoffPanel() {
  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Sign-off</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">Signature state</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">Signatures are bound to the document content hash and audit trail. Changing the document after sign-off makes the previous signature historic.</p>
    </aside>
  )
}
