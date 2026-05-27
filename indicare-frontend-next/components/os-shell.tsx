import { Bell, Command, Sparkles } from 'lucide-react'
import { ReactNode } from 'react'

export function OSShell({
  children,
  rail
}: {
  children: ReactNode
  rail?: ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white shadow-lg shadow-blue-500/30">
            IC
          </div>

          <div>
            <h1 className="text-sm font-black tracking-tight">IndiCare OS</h1>
            <p className="text-xs text-slate-500">Children&apos;s home workspace</p>
          </div>
        </div>

        <nav className="flex-1 overflow-auto px-4 py-6">
          <div className="space-y-8">
            <div>
              <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Care
              </p>

              <div className="space-y-1">
                {['Today', 'Young Person', 'Journey', 'Timeline'].map((label, index) => (
                  <button
                    key={label}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                      index === 0
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Recording
              </p>

              <div className="space-y-1">
                {['Daily Recording', 'Incidents', 'Health', 'Direct Work'].map((label) => (
                  <button
                    key={label}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Command className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-slate-200 bg-[#08142d] px-8 py-4 text-white shadow-2xl shadow-slate-900/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                <span>Home 1</span>
                <span>/</span>
                <span>Young person 1</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                <Bell className="h-4 w-4" />
              </button>

              <button className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                Assistant
              </button>

              <button className="rounded-2xl bg-white px-5 py-2 text-sm font-black text-slate-900 shadow-lg shadow-blue-950/20 transition hover:translate-y-[-1px]">
                + Record
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-auto px-8 py-8">{children}</div>

          {rail ? (
            <aside className="hidden w-[340px] shrink-0 overflow-auto border-l border-slate-200 bg-white/60 p-6 backdrop-blur-xl xl:block">
              {rail}
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  )
}
