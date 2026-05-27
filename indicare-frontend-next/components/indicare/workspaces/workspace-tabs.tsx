export function WorkspaceTabs({ tabs }: { tabs: string[] }) {
  return (
    <nav className="flex gap-2 overflow-x-auto rounded-[24px] border border-slate-100 bg-white p-2">
      {tabs.map((tab, index) => (
        <a key={tab} href={`#${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-black ${index === 0 ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
          {tab}
        </a>
      ))}
    </nav>
  )
}

