import { LoadingSkeleton } from '@/components/loading-skeleton'

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="animate-pulse rounded-[32px] border border-white/70 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="mt-5 h-10 w-64 rounded-full bg-slate-200" />
          <div className="mt-6 h-4 w-2/3 rounded-full bg-slate-200" />
        </div>

        <LoadingSkeleton />
      </div>
    </main>
  )
}
