const routes = [
  {
    href: '/life_echo/memory-box',
    label: 'Memory box',
  },
  {
    href: '/life_echo/playback',
    label: 'Playback',
  },
  {
    href: '/life_echo/relationships',
    label: 'Relationships',
  },
  {
    href: '/life_echo/reflections',
    label: 'Reflections',
  },
  {
    href: '/life_echo/voice',
    label: 'Voice memories',
  },
  {
    href: '/life_echo/child-space',
    label: 'Child space',
  },
]

export function LifeEchoNavigation() {
  return (
    <nav className="sticky top-6 z-50 flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-2xl">
      {routes.map((route) => (
        <a
          key={route.href}
          href={route.href}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {route.label}
        </a>
      ))}
    </nav>
  )
}
