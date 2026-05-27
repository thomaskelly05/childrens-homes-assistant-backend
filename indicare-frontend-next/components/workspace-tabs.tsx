const tabs = ['All','Daily','Direct work','Incidents','Health','Education']

export function WorkspaceTabs() {
  return (
    <div className="flex gap-2 overflow-auto rounded-[24px] border border-white/70 bg-white/80 p-2 shadow-[0_10px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      {tabs.map((tab, index) => (
        <button
          key={tab}
          className={index === 0 ? 'whitespace-nowrap rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition' : 'whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
