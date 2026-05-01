import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { WSEvent } from '../types'
import { useRunStore } from '../store/runStore'
import { useWsStore } from '../store/wsStore'

const PING_INTERVAL_MS = 25_000
const MAX_RECONNECT_DELAY_MS = 30_000

export function useWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isUnmountedRef = useRef(false)

  const { appendLog, updateTask, setRunStatus } = useRunStore.getState()
  const { setConnected, incrementReconnect, resetReconnect, setLastEventType } =
    useWsStore.getState()

  useEffect(() => {
    isUnmountedRef.current = false

    function clearPing() {
      if (pingTimerRef.current !== null) {
        clearInterval(pingTimerRef.current)
        pingTimerRef.current = null
      }
    }

    function clearReconnectTimer() {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    function startPing(ws: WebSocket) {
      clearPing()
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, PING_INTERVAL_MS)
    }

    function connect(attempt: number) {
      if (isUnmountedRef.current) return

      const url = `ws://${window.location.host}/ws`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close()
          return
        }
        setConnected(true)
        resetReconnect()
        startPing(ws)
      }

      ws.onmessage = (event: MessageEvent) => {
        let parsed: WSEvent
        try {
          parsed = JSON.parse(event.data as string) as WSEvent
        } catch {
          return
        }

        setLastEventType(parsed.type)

        switch (parsed.type) {
          case 'run.log':
            appendLog(parsed.line)
            break
          case 'run.task':
            if (parsed.task.id) {
              updateTask({ ...parsed.task, id: parsed.task.id })
            }
            break
          case 'run.status':
            setRunStatus(parsed.status)
            break
          case 'file.changed':
            void queryClient.invalidateQueries()
            break
          default:
            break
        }
      }

      ws.onclose = () => {
        if (isUnmountedRef.current) return
        setConnected(false)
        clearPing()
        incrementReconnect()

        const delay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY_MS)
        reconnectTimerRef.current = setTimeout(() => {
          connect(attempt + 1)
        }, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect(0)

    return () => {
      isUnmountedRef.current = true
      clearPing()
      clearReconnectTimer()
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
      setConnected(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return useWsStore((s) => ({
    connected: s.connected,
    reconnectAttempts: s.reconnectAttempts,
    lastEventType: s.lastEventType,
  }))
}
