'use client'

import type { LucideIcon } from 'lucide-react'
import {
  AlignLeft,
  Bold,
  Check,
  ClipboardCopy,
  Download,
  Eraser,
  FileEdit,
  Heading1,
  Heading2,
  HelpCircle,
  Home,
  Italic,
  LifeBuoy,
  List,
  ListOrdered,
  MessageSquare,
  MessageSquarePlus,
  MessagesSquare,
  Mic,
  Minus,
  Pause,
  PenLine,
  Play,
  Printer,
  Quote,
  Redo2,
  Save,
  Send,
  Settings,
  Sparkles,
  Square,
  Table,
  Underline,
  Undo2,
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
  | 'record'
  | 'pause'
  | 'play'
  | 'stop'
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'list'
  | 'list_ordered'
  | 'quote'
  | 'table'
  | 'copy'
  | 'print'
  | 'download'
  | 'check'
  | 'divider'
  | 'align_left'
  | 'clear_format'
  | 'heading1'
  | 'heading2'

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
  export: Download,
  record: Mic,
  pause: Pause,
  play: Play,
  stop: Square,
  undo: Undo2,
  redo: Redo2,
  bold: Bold,
  italic: Italic,
  underline: Underline,
  list: List,
  list_ordered: ListOrdered,
  quote: Quote,
  table: Table,
  copy: ClipboardCopy,
  print: Printer,
  download: Download,
  check: Check,
  divider: Minus,
  align_left: AlignLeft,
  clear_format: Eraser,
  heading1: Heading1,
  heading2: Heading2
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

export { ORB_ICON_MAP }
