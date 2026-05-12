export function MobileNav() {
  const items = ['Today', 'Records', 'Journey', 'Alerts', 'Assistant']

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-24px)] max-w-md -translate-x-1/2 items-center justify-between rounded-[28px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:hidden">
      {items.map((item, index) => (
        <button
          key={item}
          className={index === 0 ? 'rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white' : 'px-3 py-3 text-xs font-black text-slate-500'}
        >
          {item}
        </button>
      ))}
    </nav>
  )
}
