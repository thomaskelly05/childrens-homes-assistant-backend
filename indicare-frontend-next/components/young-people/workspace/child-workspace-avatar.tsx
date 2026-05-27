'use client'

import { useState } from 'react'

type ChildWorkspaceAvatarProps = {
  photo: string
  displayName: string
  initials: string
}

export function ChildWorkspaceAvatar({ photo, displayName, initials }: ChildWorkspaceAvatarProps) {
  const [failed, setFailed] = useState(false)
  const showPhoto = Boolean(photo) && !failed

  if (showPhoto) {
    return (
      <img
        key={photo}
        src={photo}
        alt={`Photo of ${displayName}`}
        className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-md shadow-sky-200/40 ring-2 ring-white md:h-28 md:w-28 md:rounded-[32px] md:ring-4"
        data-testid="child-workspace-hero-avatar"
        onError={() => setFailed(true)}
        decoding="async"
      />
    )
  }

  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-xl font-black text-white shadow-md md:h-28 md:w-28 md:rounded-[32px] md:text-3xl"
      data-testid="child-avatar-fallback"
      role="img"
      aria-label={`Avatar for ${displayName}`}
    >
      {initials}
    </div>
  )
}
