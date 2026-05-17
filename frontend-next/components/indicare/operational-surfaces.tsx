import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type SurfaceTone = 'default' | 'blue' | 'warm' | 'dark'

const toneClasses: Record<SurfaceTone, string> = {
  default: 'bg-white/82 text-slate-950 ring-white/80',
  blue: 'bg-gradient-to-br from-white via-blue-50/80 to-sky-50 text-slate-950 ring-blue-100/70',
  warm: 'bg-gradient-to-br from-white via-amber-50/70 to-rose-50/50 text-slate-950 ring-white/80',
  dark: 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white ring-white/10'
}

export function OperationalSurface({
  children,
  className = '',
  tone = 'default',
  ...props
}: { children: ReactNode; className?: string; tone?: SurfaceTone } & ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      {...props}
      className={`rounded-[34px] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 ${toneClasses[tone]} ${className}`}
    >
      {children}
    </section>
  )
}

export function FocusSurface(props: ComponentPropsWithoutRef<typeof OperationalSurface>) {
  return <OperationalSurface {...props} className={`p-8 md:p-10 ${props.className || ''}`} />
}

export function ContextSurface(props: ComponentPropsWithoutRef<typeof OperationalSurface>) {
  return <OperationalSurface {...props} className={`shadow-[0_16px_44px_rgba(15,23,42,0.06)] ${props.className || ''}`} />
}

export function AmbientSurface(props: ComponentPropsWithoutRef<typeof OperationalSurface>) {
  return <OperationalSurface {...props} className={`bg-white/60 shadow-none ${props.className || ''}`} />
}

export function WorkspaceStack({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-6 ${className}`}>{children}</div>
}

export function WorkspaceColumn({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-6 ${className}`}>{children}</div>
}

function SurfaceHeading({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description?: string; dark?: boolean }) {
  return (
    <div className="mb-6">
      <p className={`text-[11px] font-black uppercase tracking-[0.24em] ${dark ? 'text-blue-200' : 'text-blue-700'}`}>{eyebrow}</p>
      <h2 className={`mt-2 text-2xl font-black tracking-[-0.05em] md:text-3xl ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      {description ? <p className={`mt-3 max-w-3xl text-sm leading-7 ${dark ? 'text-blue-100/80' : 'text-slate-500'}`}>{description}</p> : null}
    </div>
  )
}

export function ProfileHeroSurface({
  name,
  subtitle,
  details,
  avatar
}: {
  name: string
  subtitle: string
  details: string[]
  avatar?: string
}) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'IC'
  return (
    <FocusSurface tone="blue">
      <div className="flex flex-wrap items-center gap-6">
        {avatar ? (
          <div className="h-28 w-28 rounded-[32px] bg-cover bg-center shadow-xl shadow-blue-950/10" style={{ backgroundImage: `url(${avatar})` }} />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-blue-600 to-slate-950 text-3xl font-black text-white shadow-xl shadow-blue-500/25">{initials}</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Profile</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-5xl">{name}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {details.filter(Boolean).map((detail) => (
              <span key={detail} className="rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600 ring-1 ring-white">{detail}</span>
            ))}
          </div>
        </div>
      </div>
    </FocusSurface>
  )
}

export function ChildIdentitySurface({ children }: { children: ReactNode }) {
  return <FocusSurface tone="warm">{children}</FocusSurface>
}

export function HomeHeartbeatSurface({ children }: { children: ReactNode }) {
  return <FocusSurface tone="blue">{children}</FocusSurface>
}

export function ChronologySurface({ children, description }: { children: ReactNode; description?: string }) {
  return (
    <ContextSurface>
      <SurfaceHeading eyebrow="Chronology" title="Recent operational continuity" description={description} />
      {children}
    </ContextSurface>
  )
}

export function ConnectSurface({ children, unread = 0 }: { children: ReactNode; unread?: number }) {
  return (
    <ContextSurface tone="blue">
      <SurfaceHeading eyebrow="Connect" title={`${unread} unread`} description="Real home communication only; no fabricated messages." />
      {children}
    </ContextSurface>
  )
}

export function NotificationSurface({ children, unread = 0 }: { children: ReactNode; unread?: number }) {
  return (
    <ContextSurface>
      <SurfaceHeading eyebrow="Notifications" title={`${unread} unread`} description="Provider-scoped notifications from live tables." />
      {children}
    </ContextSurface>
  )
}

export function HandoverSurface({ children, status }: { children: ReactNode; status?: string }) {
  return (
    <ContextSurface>
      <SurfaceHeading eyebrow="Handover" title={status === 'available' ? 'Today’s handover' : 'No handover returned'} description="Shift continuity appears here when recorded." />
      {children}
    </ContextSurface>
  )
}
