'use client'

import { useEffect, useRef } from 'react'

const RESCUE_DELAY_MS = 300

type PendingRescue = {
  timeoutId: ReturnType<typeof setTimeout>
  urlAtClick: string
}

/**
 * Permanent fallback when Next.js client navigation stalls after a local link click.
 * Lets Link/router handle the click first; if the URL is unchanged after ~300ms, uses
 * native `window.location.assign`.
 *
 * Escape hatch: add `data-no-navigation-rescue="true"` on any anchor that must never
 * trigger a forced navigation (e.g. in-place toggles wired as links).
 */
export function NavigationRescue() {
  const listenerAttachedRef = useRef(false)
  const pendingRef = useRef<PendingRescue | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    if (listenerAttachedRef.current) return undefined
    listenerAttachedRef.current = true

    function navDebugEnabled(): boolean {
      if (process.env.NODE_ENV !== 'production') return true
      try {
        return new URLSearchParams(window.location.search).get('nav_debug') === '1'
      } catch {
        return false
      }
    }

    function logNavDebug(...args: unknown[]) {
      if (!navDebugEnabled()) return
      console.debug('[nav-rescue]', ...args)
    }

    function clearPending() {
      const pending = pendingRef.current
      if (!pending) return
      clearTimeout(pending.timeoutId)
      pendingRef.current = null
    }

    function isPlainLeftClick(event: MouseEvent): boolean {
      return (
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
      )
    }

    function resolveAnchor(event: MouseEvent): HTMLAnchorElement | null {
      const target = event.target
      if (!(target instanceof Element)) return null
      const anchor = target.closest('a[href]')
      return anchor instanceof HTMLAnchorElement ? anchor : null
    }

    function shouldWatchAnchor(anchor: HTMLAnchorElement): URL | null {
      if (anchor.getAttribute('data-no-navigation-rescue') === 'true') return null

      const rawHref = anchor.getAttribute('href')
      if (!rawHref || rawHref === '#' || rawHref.startsWith('#')) return null

      const lowered = rawHref.trim().toLowerCase()
      if (
        lowered.startsWith('mailto:') ||
        lowered.startsWith('tel:') ||
        lowered.startsWith('javascript:')
      ) {
        return null
      }

      const target = anchor.getAttribute('target')
      if (target && target !== '_self') return null

      if (anchor.hasAttribute('download')) return null

      let url: URL
      try {
        url = new URL(rawHref, window.location.href)
      } catch {
        return null
      }

      if (url.origin !== window.location.origin) return null

      const current = new URL(window.location.href)
      if (
        url.pathname === current.pathname &&
        url.search === current.search &&
        url.hash !== '' &&
        url.hash !== current.hash
      ) {
        return null
      }

      if (
        url.pathname === current.pathname &&
        url.search === current.search &&
        url.hash === current.hash
      ) {
        return null
      }

      return url
    }

    function onDocumentClick(event: MouseEvent) {
      if (!isPlainLeftClick(event)) return

      const anchor = resolveAnchor(event)
      if (!anchor) return

      const url = shouldWatchAnchor(anchor)
      if (!url) return

      if (event.defaultPrevented) return

      clearPending()

      const urlAtClick = window.location.href
      logNavDebug('captured link', url.toString(), 'from', urlAtClick)

      const timeoutId = setTimeout(() => {
        pendingRef.current = null

        if (window.location.href !== urlAtClick) return

        logNavDebug('rescue fallback', url.toString())
        window.location.assign(url.toString())
      }, RESCUE_DELAY_MS)

      pendingRef.current = { timeoutId, urlAtClick }
    }

    document.addEventListener('click', onDocumentClick, { capture: true })
    return () => {
      clearPending()
      document.removeEventListener('click', onDocumentClick, { capture: true })
      listenerAttachedRef.current = false
    }
  }, [])

  return null
}
