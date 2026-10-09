import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import {
  dismissNotification,
  notificationStore,
  type Notification,
} from '../notifications/notifications'
export function NotificationViewport() {
  const { items, target } = useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
  )
  return createPortal(
    <div
      role="region"
      aria-label="Notificaciones"
      className={
        'pointer-events-none fixed right-3 left-3 z-50 flex flex-col gap-3 sm:right-6 sm:left-auto sm:w-96 ' +
        (target?.dataset.modalVariant === 'chat' ? 'top-3 sm:top-6' : 'bottom-3 sm:bottom-6')
      }
    >
      {items.map((item) => (
        <NotificationCard key={item.id} item={item} />
      ))}
    </div>,
    target ?? document.body,
  )
}
function NotificationCard({ item }: { item: Notification }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const paused = useRef(false)
  const remaining = useRef(0)
  const started = useRef(0)
  const returnFocus = useRef<HTMLElement | null>(null)
  function clear() {
    clearTimeout(timer.current)
  }
  function resume() {
    if (paused.current) return
    clear()
    started.current = Date.now()
    timer.current = setTimeout(() => dismissNotification(item.id), remaining.current)
  }
  function pause() {
    if (paused.current) return
    paused.current = true
    remaining.current = Math.max(0, remaining.current - (Date.now() - started.current))
    clear()
  }
  function continueTimer(element: HTMLElement) {
    if (!paused.current) return
    if (element.matches(':hover') || element.contains(document.activeElement)) return
    paused.current = false
    resume()
  }
  useEffect(() => {
    started.current = Date.now()
    remaining.current = Math.max(0, item.expiresAt - started.current)
    timer.current = setTimeout(() => dismissNotification(item.id), remaining.current)
    return () => clearTimeout(timer.current)
  }, [item.id, item.expiresAt])
  const error = item.tone === 'error'
  const Icon = error ? AlertCircle : CheckCircle2
  return (
    <div
      role={error ? 'alert' : 'status'}
      aria-atomic="true"
      data-notification={item.tone}
      onMouseEnter={pause}
      onMouseLeave={(e) => continueTimer(e.currentTarget)}
      onFocus={(e) => {
        if (e.relatedTarget instanceof HTMLElement && !e.currentTarget.contains(e.relatedTarget))
          returnFocus.current = e.relatedTarget
        pause()
      }}
      onBlur={(e) => continueTimer(e.currentTarget)}
      className={
        'pointer-events-none flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl ' +
        (error ? 'border-red-200 text-red-900' : 'border-emerald-200 text-emerald-900')
      }
    >
      <Icon aria-hidden="true" size={21} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {error ? 'No se pudo completar' : 'Operación completada'}
        </p>
        <p className="mt-1 text-sm leading-5 break-words">{item.message}</p>
      </div>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={() => {
          if (returnFocus.current?.isConnected) returnFocus.current.focus()
          else notificationStore.getSnapshot().target?.focus()
          dismissNotification(item.id)
        }}
        className="pointer-events-auto -mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <X aria-hidden="true" size={18} />
      </button>
    </div>
  )
}
