'use client'

import { Menu, Settings, User } from 'lucide-react'
import type { DragEvent, ReactNode } from 'react'

import { ORB_RESIDENTIAL_TAGLINE } from '@/lib/orb/orb-residential-copy'

export type OrbMobileChatHeaderProps = {
  onOpenMenu: () => void
  onOpenAccount: (anchor: HTMLElement) => void
  productName?: string
  tagline?: string
  /** Hide the secondary tagline row on phone for calmer chrome. */
  showTagline?: boolean
  /** Prefer settings icon when true; defaults to user icon. */
  accountUsesSettingsIcon?: boolean
}

/** ChatGPT-style mobile top bar: menu, centred ORB brand, account/settings. */
export function OrbMobileChatHeader({
  onOpenMenu,
  onOpenAccount,
  productName = 'ORB',
  tagline = ORB_RESIDENTIAL_TAGLINE,
  showTagline = true,
  accountUsesSettingsIcon = false
}: OrbMobileChatHeaderProps) {
  const AccountIcon = accountUsesSettingsIcon ? Settings : User

  return (
    <header
      className="orb-chat-header orb-mobile-chat-header relative z-10 flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/40 bg-[var(--orb-bg-deep)]/90 px-3 py-2 backdrop-blur-sm lg:hidden"
      data-orb-mobile-header
    >
      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orb-royal-blue,#168bff)]"
        onClick={onOpenMenu}
        aria-label="Open menu"
        data-orb-mobile-menu
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div
        className="pointer-events-none flex min-w-0 flex-1 flex-col items-center justify-center px-1 text-center"
        data-orb-mobile-header-brand
      >
        <p
          className="truncate text-[0.9375rem] font-bold leading-tight tracking-[-0.03em] text-[var(--orb-foreground)]"
          data-orb-header-title
          data-orb-header-brand-title
        >
          {productName}
        </p>
        {showTagline && tagline ? (
          <p
            className="mt-0.5 max-w-[14rem] truncate text-[10px] font-semibold leading-snug text-[var(--orb-muted)]"
            data-orb-mobile-header-tagline
          >
            {tagline}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-royal-blue,#168bff)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orb-royal-blue,#168bff)]"
        onClick={(event) => onOpenAccount(event.currentTarget)}
        aria-label="Account and settings"
        data-orb-mobile-account
        data-orb-header-profile
      >
        <AccountIcon className="h-5 w-5" aria-hidden />
      </button>
    </header>
  )
}

export type OrbLayoutProps = {
  /** Residential `/orb` surface — enables collapsed sidebar widths. */
  residentialSurface?: boolean
  sidebarOpen: boolean
  sidebarCollapsed?: boolean
  onCloseSidebarOverlay: () => void
  /** Desktop sidebar + mobile drawer content. */
  sidebar: ReactNode
  /** Mobile top bar (`lg:hidden`). When set, `header` is desktop-only. */
  mobileHeader?: ReactNode
  /** Desktop header row (`hidden lg:flex` when `mobileHeader` is set). */
  header: ReactNode
  /** Optional banners and context rows above the chat thread. */
  preThread?: ReactNode
  /** Scrollable chat thread (include scroll container ref in this tree). */
  thread: ReactNode
  /** Optional scroll-to-bottom control inside the main column. */
  scrollFab?: ReactNode
  /** Bottom composer dock. */
  composer: ReactNode
  /** Optional right contextual panel (station drawers use overlay modals elsewhere). */
  rightPanel?: ReactNode
  onDragOver?: (event: DragEvent) => void
  onDrop?: (event: DragEvent) => void
  guidedDemoActive?: boolean
}

/**
 * Canonical ORB chat chrome: sidebar, header, central thread, composer, optional right panel.
 * Feature panels and modals stay in `OrbCareCompanion`; this component owns layout structure only.
 */
export function OrbLayout({
  residentialSurface = false,
  sidebarOpen,
  sidebarCollapsed = false,
  onCloseSidebarOverlay,
  sidebar,
  mobileHeader,
  header,
  preThread,
  thread,
  scrollFab,
  composer,
  rightPanel,
  onDragOver,
  onDrop,
  guidedDemoActive = false
}: OrbLayoutProps) {
  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          className="orb-panel-overlay fixed inset-0 z-40 lg:hidden"
          aria-label="Close sidebar"
          onClick={onCloseSidebarOverlay}
        />
      ) : null}

      <div
        className={`relative flex min-h-0 flex-1 ${residentialSurface ? 'orb-chat-shell' : ''}`}
        data-orb-sidebar-state={residentialSurface ? (sidebarCollapsed ? 'collapsed' : 'expanded') : undefined}
        data-orb-sidebar-collapsed={residentialSurface && sidebarCollapsed ? 'true' : undefined}
      >
        <aside
          className={`orb-chat-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--orb-line)]/50 transition-[transform,width] duration-200 motion-reduce:transition-none lg:static lg:z-auto lg:translate-x-0 ${
            residentialSurface
              ? sidebarCollapsed
                ? 'w-[var(--orb-sidebar-width-collapsed,4.25rem)] max-w-[var(--orb-sidebar-width-collapsed,4.25rem)] lg:w-[var(--orb-sidebar-width-collapsed,4.25rem)]'
                : 'w-[min(100%,var(--orb-sidebar-width,18.125rem))] max-w-[var(--orb-sidebar-width,18.125rem)] lg:w-[var(--orb-sidebar-width,18.125rem)]'
              : 'w-[min(100%,18.75rem)] lg:w-[18.75rem]'
          } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          data-orb-sidebar-scroll-container
          data-orb-sidebar-state={residentialSurface ? (sidebarCollapsed ? 'collapsed' : 'expanded') : undefined}
          data-orb-sidebar-collapsed={residentialSurface && sidebarCollapsed ? 'true' : undefined}
          data-orb-guided-demo-active={guidedDemoActive ? 'true' : undefined}
        >
          {sidebar}
        </aside>

        <div className="orb-chat-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {mobileHeader}
          <div className={mobileHeader ? 'hidden lg:contents' : 'contents'}>{header}</div>
          {preThread}
          <section
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onDragOver={onDragOver}
            onDrop={onDrop}
            data-orb-chat-body
          >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {thread}
              {scrollFab}
            </div>
            {composer}
          </section>
        </div>

        {rightPanel ? (
          <aside
            className="orb-chat-context-panel hidden w-[min(100%,var(--orb-context-panel-width,22rem))] min-w-0 shrink-0 flex-col border-l border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]/80 backdrop-blur-md xl:flex"
            data-orb-context-panel
            data-orb-context-panel-slot
            aria-label="ORB contextual panel"
          >
            <div className="orb-context-panel-inner flex min-h-0 flex-1 flex-col overflow-hidden">
              {rightPanel}
            </div>
          </aside>
        ) : null}
      </div>
    </>
  )
}
