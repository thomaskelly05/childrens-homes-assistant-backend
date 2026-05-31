'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  CreditCard,
  FileCheck,
  FileText,
  MapPin,
  MessageSquarePlus,
  Save,
  Search,
  Settings,
  Shield,
  User,
  X
} from 'lucide-react'

import { OrbHueMark } from '@/components/orb-standalone/orb-hue-logo'
import type { AdultProfile } from '@/lib/orb/adult-profile-store'
import { OrbSidebarChatList } from '@/components/orb-standalone/orb-sidebar-chat-menu'
import { searchChats, type StandaloneChat, type StandaloneWorkspace } from '@/lib/orb/standalone-local-store'

const STATIONS = [
  { id: 'review', label: 'Review This', icon: FileCheck },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'saved', label: 'Saved Outputs', icon: Save },
  { id: 'locality', label: 'Locality Risk', icon: MapPin },
  { id: 'ofsted', label: 'Ofsted Lens', icon: FileText },
  { id: 'safeguarding', label: 'Safeguarding Lens', icon: Shield }
] as const

export type OrbResidentialStationId = (typeof STATIONS)[number]['id']

function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function groupChatsByRecency(chats: StandaloneChat[]) {
  const now = Date.now()
  const todayStart = startOfDay(now)
  const sevenDaysStart = todayStart - 6 * 86_400_000

  const today: StandaloneChat[] = []
  const previous7: StandaloneChat[] = []
  const older: StandaloneChat[] = []

  for (const chat of chats) {
    const stamp = chat.updatedAt || chat.createdAt
    if (stamp >= todayStart) today.push(chat)
    else if (stamp >= sevenDaysStart) previous7.push(chat)
    else older.push(chat)
  }

  const groups: Array<{ label: string; chats: StandaloneChat[] }> = []
  if (today.length) groups.push({ label: 'Today', chats: today })
  if (previous7.length) groups.push({ label: 'Recent', chats: previous7 })
  if (older.length) groups.push({ label: 'Older', chats: older })
  return groups
}

export function OrbResidentialSidebar({
  workspace,
  chatSearch,
  onChatSearchChange,
  onSelectChat,
  onNewChat,
  onOpenStation,
  onOpenSettings,
  onOpenSavedOutputs,
  onOpenProfile,
  onWorkspaceChange,
  adultProfile,
  savedOutputsCount,
  onClose
}: {
  workspace: StandaloneWorkspace
  chatSearch: string
  onChatSearchChange: (value: string) => void
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onOpenStation: (station: OrbResidentialStationId) => void
  onOpenSettings?: () => void
  onOpenSavedOutputs?: () => void
  onOpenProfile?: () => void
  onWorkspaceChange: (next: StandaloneWorkspace) => void
  adultProfile?: AdultProfile | null
  savedOutputsCount?: number
  onClose?: () => void
}) {
  const filteredChats = useMemo(
    () => searchChats(workspace.chats, chatSearch, { includeArchived: false }),
    [workspace.chats, chatSearch]
  )
  const timeGroupedChats = useMemo(() => groupChatsByRecency(filteredChats), [filteredChats])

  function updateChat(chatId: string, patch: Partial<StandaloneChat>) {
    onWorkspaceChange({
      ...workspace,
      chats: workspace.chats.map((c) => (c.id === chatId ? { ...c, ...patch, updatedAt: Date.now() } : c))
    })
  }

  function deleteChat(chatId: string) {
    const chats = workspace.chats.filter((c) => c.id !== chatId)
    const activeChatId = workspace.activeChatId === chatId ? chats[0]?.id ?? null : workspace.activeChatId
    onWorkspaceChange({ ...workspace, chats, activeChatId })
  }

  function renameChat(chatId: string) {
    const chat = workspace.chats.find((c) => c.id === chatId)
    if (!chat) return
    const next = window.prompt('Rename chat', chat.title)
    if (!next?.trim()) return
    updateChat(chatId, { title: next.trim() })
  }

  return (
    <>
      <div className="shrink-0 border-b border-[var(--orb-line)] px-3 py-3.5">
        <div className="flex items-start gap-2.5">
          <OrbHueMark className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="orb-hue-text text-sm font-semibold leading-tight" data-orb-sidebar-brand>
              ORB Residential
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--orb-muted)]">Powered by IndiCare Intelligence</p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="rounded-lg p-1 text-[var(--orb-muted)] lg:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="orb-sidebar-nav-item orb-sidebar-nav-item--active mt-3 w-full"
          data-orb-sidebar-new-chat
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>New chat</span>
        </button>
      </div>

      <div className="orb-sidebar-group min-h-0 flex-1 overflow-y-auto px-2 py-3" data-orb-sidebar-scroll>
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
          Recent chats
        </p>
        <label className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[var(--orb-muted)]" aria-hidden />
          <input
            type="search"
            value={chatSearch}
            onChange={(e) => onChatSearchChange(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
            data-orb-sidebar-search
          />
        </label>

        {filteredChats.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--orb-muted)]">No chats yet — ask ORB anything.</p>
        ) : (
          <div className="space-y-3">
            {timeGroupedChats.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--orb-muted)]">
                  {group.label}
                </p>
                <OrbSidebarChatList
                  chats={group.chats}
                  activeChatId={workspace.activeChatId}
                  onSelectChat={onSelectChat}
                  onRename={renameChat}
                  onDelete={deleteChat}
                  onPin={(chat) => updateChat(chat.id, { pinned: !chat.pinned })}
                  onArchive={(chat) => updateChat(chat.id, { archived: true })}
                />
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
          Stations
        </p>
        <ul className="space-y-0.5" data-orb-sidebar-stations>
          {STATIONS.map((station) => {
            const Icon = station.icon
            const badge =
              station.id === 'saved' && savedOutputsCount
                ? String(savedOutputsCount)
                : undefined
            return (
              <li key={station.id}>
                <button
                  type="button"
                  onClick={() => onOpenStation(station.id)}
                  className="orb-sidebar-nav-item w-full"
                  data-orb-sidebar-station={station.id}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{station.label}</span>
                  {badge ? (
                    <span className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px]">
                      {badge}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="shrink-0 space-y-0.5 border-t border-[var(--orb-line)] p-2" data-orb-sidebar-bottom>
        <button
          type="button"
          onClick={() => onOpenProfile?.()}
          className="orb-sidebar-nav-item w-full"
          data-orb-sidebar-profile
        >
          <User className="h-4 w-4" />
          <span className="truncate">{adultProfile?.name?.trim() || 'Profile'}</span>
        </button>
        <Link href="/orb/billing" className="orb-sidebar-nav-item w-full" data-orb-sidebar-billing>
          <CreditCard className="h-4 w-4" />
          <span>Billing</span>
        </Link>
        <button
          type="button"
          onClick={() => onOpenSettings?.()}
          className="orb-sidebar-nav-item w-full"
          data-orb-sidebar-settings
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
        <Link href="/os" className="orb-sidebar-nav-item w-full" data-orb-sidebar-os-link>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-500">IndiCare OS</span>
        </Link>
      </div>
    </>
  )
}
