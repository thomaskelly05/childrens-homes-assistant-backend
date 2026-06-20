'use client'

import type { LucideIcon } from 'lucide-react'
import {
  FileEdit,
  HelpCircle,
  Home,
  LifeBuoy,
  MessageSquare,
  MessageSquarePlus,
  MessagesSquare,
  Mic,
  PenLine,
  Save,
  Send,
  Settings,
  Sparkles,
  Upload
} from 'lucide-react'

export type OrbIconName =
  | 'home'
  | 'chat'
  | 'new_chat'
  | 'dictate'
  | 'voice'
  | 'communicate'
  | 'write'
  | 'records'
  | 'help'
  | 'settings'
  | 'send'
  | 'upload'
  | 'review'
  | 'save'
  | 'export'

const ORB_ICON_MAP: Record<OrbIconName, LucideIcon> = {
  home: Home,
  chat: MessageSquare,
  new_chat: MessageSquarePlus,
  dictate: PenLine,
  voice: Mic,
  communicate: MessagesSquare,
  write: FileEdit,
  records: Save,
  help: LifeBuoy,
  settings: Settings,
  send: Send,
  upload: Upload,
  review: Sparkles,
  save: Save,
  export: FileEdit
}

const SIZE_CLASS = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
} as const

/** Central ORB icon — consistent stroke size and alignment. */
export function OrbIcon({
  name,
  size = 'md',
  className = '',
  label
}: {
  name: OrbIconName
  size?: keyof typeof SIZE_CLASS
  className?: string
  label?: string
}) {
  const Icon = ORB_ICON_MAP[name] ?? HelpCircle
  return (
    <Icon
      className={`orb-icon shrink-0 ${SIZE_CLASS[size]} ${className}`.trim()}
      strokeWidth={1.75}
      aria-hidden={!label}
      aria-label={label}
      data-orb-icon={name}
    />
  )
}
