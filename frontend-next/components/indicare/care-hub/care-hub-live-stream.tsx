'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { StatusBadge } from '@/components/indicare/ui'
import {
  buildOperationalWsUrl,
  fetchCareHubLive,
  fetchOperationalStreamSnapshot,
  type OperationalStreamStatus
} from '@/lib/os-api/realtime-operational'
import { emitOperationalEvent } from '@/lib/os-api/events'

const POLL_FALLBACK_MS = 30000

export function CareHubLiveStreamBar({
  homeId,
  youngPersonId
}: {
  homeId?: string
  youngPersonId?: string
}) {
  const [status, setStatus] = useState<OperationalStreamStatus>({ status: 'connecting' })
  const socketRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cursorRef = useRef<number | undefined>(undefined)

  const refreshSnapshot = useCallback(async () => {
    const started = performance.now()
    const snapshot = await fetchOperationalStreamSnapshot({ homeId, youngPersonId, limit: 50 })
    const latencyMs = snapshot.data?.latency_ms ?? Math.round(performance.now() - started)
    setStatus({
      status: status.status === 'offline' ? 'polling' : status.status,
      latencyMs,
      lastUpdateAt: snapshot.data?.generated_at || new Date().toISOString()
    })
    emitOperationalEvent('command-centre:refresh')
  }, [homeId, youngPersonId, status.status])

  const pollFallback = useCallback(async () => {
    setStatus((prev) => ({ ...prev, status: 'polling' }))
    await fetchCareHubLive({ homeId, youngPersonId, limit: 50 })
    await refreshSnapshot()
  }, [homeId, youngPersonId, refreshSnapshot])

  useEffect(() => {
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      setStatus((prev) => ({ ...prev, status: 'connecting' }))
      const socket = new WebSocket(buildOperationalWsUrl({ homeId, youngPersonId, afterCursor: cursorRef.current }))
      socketRef.current = socket

      socket.onopen = () => {
        if (cancelled) return
        setStatus((prev) => ({ ...prev, status: 'live' }))
      }

      socket.onmessage = (event) => {
        if (cancelled) return
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'operational.stream.update' || payload.type === 'operational.stream.ready') {
            const latencyMs = payload.snapshot?.latency_ms
            setStatus({
              status: 'live',
              latencyMs,
              lastUpdateAt: payload.snapshot?.generated_at || new Date().toISOString()
            })
            emitOperationalEvent('command-centre:refresh')
          }
          if (payload.type === 'operational.replay') {
            const next = payload.replay?.next_cursor
            if (typeof next === 'number') cursorRef.current = next
          }
          if (payload.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }))
          }
        } catch {
          /* ignore malformed frames */
        }
      }

      socket.onclose = () => {
        if (cancelled) return
        setStatus((prev) => ({ ...prev, status: 'reconnecting' }))
        window.setTimeout(connect, 2500)
      }

      socket.onerror = () => {
        if (cancelled) return
        setStatus({ status: 'polling' })
        pollFallback()
      }
    }

    connect()
    pollRef.current = setInterval(pollFallback, POLL_FALLBACK_MS)
    refreshSnapshot()

    return () => {
      cancelled = true
      socketRef.current?.close()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [homeId, youngPersonId, pollFallback, refreshSnapshot])

  const badgeValue =
    status.status === 'live'
      ? 'Live'
      : status.status === 'reconnecting'
        ? 'Reconnecting'
        : status.status === 'polling'
          ? 'Polling fallback'
          : status.status

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm"
      data-testid="care-hub-live-stream"
      role="status"
      aria-live="polite"
    >
      <StatusBadge value={badgeValue} />
      <span className="text-xs font-bold text-slate-500">
        Stream {status.status}
        {status.latencyMs != null ? ` · ${status.latencyMs}ms` : ''}
        {status.lastUpdateAt ? ` · updated ${new Date(status.lastUpdateAt).toLocaleTimeString('en-GB')}` : ''}
      </span>
      <button
        type="button"
        className="ml-auto rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700"
        onClick={() => {
          socketRef.current?.send(JSON.stringify({ type: 'refresh' }))
          refreshSnapshot()
        }}
      >
        Refresh now
      </button>
    </div>
  )
}
