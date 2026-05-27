export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-[28px] border border-slate-100 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.04)]"
        >
          <div className="h-4 w-24 rounded-full bg-slate-200" />
          <div className="mt-5 h-7 w-2/3 rounded-full bg-slate-200" />
          <div className="mt-6 space-y-3">
            <div className="h-4 rounded-full bg-slate-200" />
            <div className="h-4 rounded-full bg-slate-200" />
            <div className="h-4 w-4/5 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
