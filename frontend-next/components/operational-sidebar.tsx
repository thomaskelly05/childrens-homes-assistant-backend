export function OperationalSidebar() {
  const groups = [
    {
      title: 'Care',
      items: ['Today', 'Young people', 'Journey', 'Recording']
    },
    {
      title: 'Manage',
      items: ['Oversight', 'Safeguarding', 'Documents', 'Compliance']
    },
    {
      title: 'Operate',
      items: ['Assistant', 'Notifications', 'Runtime', 'Calendar']
    }
  ]

  return (
    <aside className="sticky top-0 flex h-screen flex-col border-r border-slate-200/70 bg-white/90 px-5 py-6 backdrop-blur-xl">
      <div className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
          IndiCare OS
        </p>

        <h1 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">
          Care OS
        </h1>
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.title}>
            <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item, index) => (
                <button
                  key={item}
                  className={index === 0 && group.title === 'Care'
                    ? 'flex w-full items-center rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-black text-white'
                    : 'flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950'}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-auto rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
          Shift continuity
        </p>

        <strong className="mt-2 block text-3xl font-black tracking-[-0.05em] text-emerald-800">
          Stable
        </strong>
      </div>
    </aside>
  )
}