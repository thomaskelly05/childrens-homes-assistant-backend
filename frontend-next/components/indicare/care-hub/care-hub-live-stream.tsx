'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { StatusBadge } from '@/components/indicare/ui'
import {
  buildOperationalWsUrl,
  fetchCareHubLive,
  fetchOperationalStreamSnapshot,
  operationalWebsocketEnabled,
  type OperationalStreamStatus
} from '@/lib/os-api/realtime-operational'
import { emitOperationalEvent } from '@/lib/os-api/events'

const POLL_FALLBACK_MS = 30000
const MAX_WS_RETRIES = 3
const INITIAL_RETRY_MS = 2500
const MAX_RETRY_MS = 30000

export function CareHubLiveStreamBar({
  homeId,
  youngPersonId
}: {
  homeId?: string
  youngPersonId?: string
}) {
  const [status, setStatus] = useState<OperationalStreamStatus>({ status: 'polling' })
  const socketRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cursorRef = useRef<number | undefined>(undefined)
  const retryRef = useRef(0)

  const refreshSnapshot = useCallback(async () => {
    const started = performance.now()
    const snapshot = await fetchOperationalStreamSnapshot({ homeId, youngPersonId, limit: 50 })
    const latencyMs = snapshot.data?.latency_ms ?? Math.round(performance.now() - started)
    setStatus((prev) => ({
      status: prev.status === 'live' ? 'live' : 'polling',
      latencyMs,
      lastUpdateAt: snapshot.data?.generated_at || new Date().toISOString()
    }))
    emitOperationalEvent('command-centre:refresh')
  }, [homeId, youngPersonId])

  const pollFallback = useCallback(async () => {
    setStatus((prev) => ({ ...prev, status: 'polling' }))
    await fetchCareHubLive({ homeId, youngPersonId, limit: 50 })
    await refreshSnapshot()
  }, [homeId, youngPersonId, refreshSnapshot])

  useEffect(() => {
    let cancelled = false

    const clearReconnect = () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }

    const scheduleReconnect = (connect: () => void) => {
      if (cancelled || !operationalWebsocketEnabled()) return
      if (retryRef.current >= MAX_WS_RETRIES) {
        setStatus((prev) => ({ ...prev, status: 'polling' }))
        return
      }
      const delay = Math.min(INITIAL_RETRY_MS * 2 ** retryRef.current, MAX_RETRY_MS)
      retryRef.current += 1
      setStatus((prev) => ({ ...prev, status: 'reconnecting' }))
      clearReconnect()
      reconnectRef.current = window.setTimeout(connect, delay)
    }

    const connect = () => {
      if (cancelled || !operationalWebsocketEnabled()) return
      if (socketRef.current && socketRef.current.readyState <= WebSocket.OPEN) return

      setStatus((prev) => ({ ...prev, status: 'connecting' }))
      const socket = new WebSocket(buildOperationalWsUrl({ homeId, youngPersonId, afterCursor: cursorRef.current }))
      socketRef.current = socket

      socket.onopen = () => {
        if (cancelled) return
        retryRef.current = 0
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
          if (payload.type === 'ping' && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'pong' }))
          }
        } catch {
          /* ignore malformed frames */
        }
      }

      socket.onclose = () => {
        if (cancelled) return
        socketRef.current = null
        scheduleReconnect(connect)
      }

      socket.onerror = () => {
        if (cancelled) return
        socket.close()
        setStatus((prev) => ({ ...prev, status: 'polling' }))
        pollFallback()
      }
    }

    pollFallback()
    pollRef.current = setInterval(pollFallback, POLL_FALLBACK_MS)

    if (operationalWebsocketEnabled()) {
      connect()
    }

    return () => {
      cancelled = true
      clearReconnect()
      socketRef.current?.close()
      socketRef.current = null
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [homeId, youngPersonId, pollFallback])

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
        className="ml-auto min-h-11 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700"
        onClick={() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'refresh' }))
          }
          refreshSnapshot()
        }}
      >
        Refresh now
      </button>
    </div>
  )
}
