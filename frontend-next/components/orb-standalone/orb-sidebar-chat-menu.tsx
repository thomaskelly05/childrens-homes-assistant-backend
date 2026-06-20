'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Archive, MoreHorizontal, Pin } from 'lucide-react'

import type { StandaloneChat } from '@/lib/orb/standalone-local-store'
import { formatOrbChatDisplayTitle } from '@/lib/orb/orb-chat-display-title'

export function OrbSidebarChatList({
  chats,
  activeChatId,
  onSelectChat,
  onRename,
  onDelete,
  onPin,
  onArchive,
  onMoveToProject
}: {
  chats: StandaloneChat[]
  activeChatId: string | null
  onSelectChat: (chatId: string) => void
  onRename: (chatId: string) => void
  onDelete: (chatId: string) => void
  onPin: (chat: StandaloneChat) => void
  onArchive: (chat: StandaloneChat) => void
  onMoveToProject?: (chatId: string) => void
}) {
  return (
    <ul className="space-y-0.5" data-orb-sidebar-chat-list>
      {chats.map((chat) => (
        <li key={chat.id} className="group flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelectChat(chat.id)}
            className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-[13px] transition ${
              activeChatId === chat.id
                ? 'orb-sidebar-chat-active font-semibold'
                : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
            }`}
            data-orb-sidebar-chat={chat.id}
          >
            {chat.pinned ? <Pin className="mr-1 inline h-3 w-3 text-amber-300/90" aria-hidden /> : null}
            {formatOrbChatDisplayTitle(chat.title)}
          </button>
          <OrbSidebarChatMenu
            chat={chat}
            onRename={() => onRename(chat.id)}
            onDelete={() => onDelete(chat.id)}
            onPin={() => onPin(chat)}
            onArchive={() => onArchive(chat)}
            onMoveToProject={onMoveToProject ? () => onMoveToProject(chat.id) : undefined}
          />
        </li>
      ))}
    </ul>
  )
}

function OrbSidebarChatMenu({
  chat,
  onRename,
  onDelete,
  onPin,
  onArchive,
  onMoveToProject
}: {
  chat: StandaloneChat
  onRename: () => void
  onDelete: () => void
  onPin: () => void
  onArchive: () => void
  onMoveToProject?: () => void
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="shrink-0 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Chat actions for ${formatOrbChatDisplayTitle(chat.title)}`}
        data-orb-sidebar-chat-menu
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      <OrbSidebarFloatingMenu open={open} anchorRef={anchorRef} onClose={() => setOpen(false)}>
        <button type="button" role="menuitem" className="orb-sidebar-dropdown-menu__item" onClick={() => { onRename(); setOpen(false) }}>
          Rename
        </button>
        <button type="button" role="menuitem" className="orb-sidebar-dropdown-menu__item" onClick={() => { onPin(); setOpen(false) }}>
          {chat.pinned ? 'Unpin' : 'Pin'}
        </button>
        <button type="button" role="menuitem" className="orb-sidebar-dropdown-menu__item" onClick={() => { onArchive(); setOpen(false) }}>
          <Archive className="mr-1.5 inline h-3 w-3 shrink-0" aria-hidden />
          Archive
        </button>
        {onMoveToProject ? (
          <button type="button" role="menuitem" className="orb-sidebar-dropdown-menu__item" onClick={() => { onMoveToProject(); setOpen(false) }}>
            Move to project
          </button>
        ) : null}
        <button type="button" role="menuitem" className="orb-sidebar-dropdown-menu__item orb-sidebar-dropdown-menu__danger" onClick={() => { onDelete(); setOpen(false) }}>
          Delete
        </button>
      </OrbSidebarFloatingMenu>
    </div>
  )
}

function OrbSidebarFloatingMenu({
  open,
  anchorRef,
  onClose,
  children
}: {
  open: boolean
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  children: ReactNode
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null)
      return
    }

    function updatePosition() {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const menuWidth = 152
      const menuHeight = 168
      const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8)
      let top = rect.bottom + 6
      if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - menuHeight - 6)
      }
      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!mounted || !open || !position) return null

  return createPortal(
    <>
      <button
        type="button"
        className="orb-sidebar-dropdown-menu__backdrop fixed inset-0 z-[9998] cursor-default bg-transparent"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="orb-sidebar-dropdown-menu orb-sidebar-dropdown-menu--chat fixed z-[9999] flex flex-col"
        style={{ top: position.top, left: position.left }}
        role="menu"
        data-orb-sidebar-chat-actions-menu
      >
        {children}
      </div>
    </>,
    document.body
  )
}
