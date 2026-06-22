'use client'

export function OrbVoiceV2Carousel<T extends string>({
  label,
  items,
  value,
  disabled,
  onChange,
  dataAttr
}: {
  label: string
  items: ReadonlyArray<{ id: T; label: string; description?: string }>
  value: T
  disabled?: boolean
  onChange: (id: T) => void
  dataAttr: string
}) {
  return (
    <div className="orb-voice-v2-carousel w-full" data-orb-voice-carousel={dataAttr}>
      <p className="mb-1.5 text-xs font-medium text-[var(--orb-muted)]">{label}</p>
      <div
        className="orb-voice-v2-carousel__track flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label={label}
      >
        {items.map((item) => {
          const active = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={active}
              disabled={disabled}
              className={`orb-voice-v2-carousel__chip shrink-0 rounded-full border px-3 py-1.5 text-left text-xs transition ${
                active
                  ? 'border-[var(--orb-primary-blue,#168bff)] bg-[var(--orb-primary-blue,#168bff)]/12 font-semibold text-[var(--orb-foreground)]'
                  : 'border-[var(--orb-line)]/50 text-[var(--orb-muted)] hover:border-[var(--orb-line)]'
              }`}
              onClick={() => onChange(item.id)}
              data-orb-voice-carousel-item={item.id}
              data-orb-voice-carousel-active={active ? true : undefined}
            >
              <span className="block">{item.label}</span>
              {item.description ? (
                <span className="mt-0.5 block text-[10px] font-normal opacity-80">{item.description}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
