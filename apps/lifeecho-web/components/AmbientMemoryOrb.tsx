export function AmbientMemoryOrb() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-[0_0_120px_rgba(123,199,255,0.18)] backdrop-blur-3xl">
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_center,rgba(123,199,255,0.45),rgba(155,126,255,0.18),transparent_72%)] animate-pulse" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(248,215,122,0.22),transparent_30%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:42px_42px] opacity-20" />
    </div>
  )
}
