export function DocumentExportPanel() {
  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Export</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">Ofsted-ready output</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">Print HTML export is live through the backend. PDF/DOCX show a controlled limitation until the server renderer is available.</p>
    </aside>
  )
}
