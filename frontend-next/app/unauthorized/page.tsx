import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-6 text-slate-950">
      <section className="w-full max-w-lg rounded-[32px] border border-amber-100 bg-white p-8 text-center shadow-2xl shadow-slate-950/10">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">Unauthorized</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">You do not have access to this area</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          IndiCare OS restricts records, assistant workflows and settings by staff role. Ask an administrator or registered manager to update your permissions.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">
          Back to dashboard
        </Link>
      </section>
    </main>
  )
}
