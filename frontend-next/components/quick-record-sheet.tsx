import { OrbButton } from '@/components/indicare/orb/orb-button'

export function QuickRecordSheet() {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Quick recording
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Create entry
          </h3>
        </div>
        <OrbButton
          placement="inline"
          context={{
            route: '/quick-recording',
            workspace: 'mobile_quick_recording',
            page_title: 'Quick recording',
            assistant_context: {
              current_route: '/quick-recording',
              current_workspace_type: 'mobile_quick_recording',
              assistant_mode: 'embedded'
            }
          }}
        />
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-400">
          Record title
        </div>

        <div className="min-h-[140px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-400">
          Chronology narrative
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">
            Save draft
          </button>

          <button className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
            Submit review
          </button>
        </div>
      </div>
    </section>
  )
}
