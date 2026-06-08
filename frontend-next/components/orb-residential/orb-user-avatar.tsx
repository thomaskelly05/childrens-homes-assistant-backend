'use client'

import { useState } from 'react'

import { profileInitialsFromName } from '@/lib/orb/orb-profile-initials'

type OrbUserAvatarProps = {
  name?: string | null
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  testId?: string
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs rounded-lg',
  md: 'h-10 w-10 text-sm rounded-xl',
  lg: 'h-11 w-11 text-sm rounded-2xl'
} as const

export function OrbUserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  testId = 'orb-user-avatar'
}: OrbUserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = profileInitialsFromName(name)
  const showImage = Boolean(avatarUrl?.trim()) && !imageFailed

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] font-semibold text-[var(--orb-primary)] ${SIZE_CLASSES[size]} ${className}`}
      data-orb-user-avatar={testId}
      data-orb-user-avatar-mode={showImage ? 'image' : 'initials'}
      aria-hidden={!name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl ?? undefined}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span data-orb-user-avatar-initials>{initials}</span>
      )}
    </div>
  )
}
