import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, MessagesSquare } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import type { useChatTimeline } from '../hooks/useChatTimeline'
import type { WhatsAppMessage } from '../model/whatsapp'
import { WhatsAppMessageContent } from './WhatsAppMessageContent'

export function WhatsAppChat({
  timeline,
  timeZone,
  dateFormat,
  onInfo,
}: {
  timeline: ReturnType<typeof useChatTimeline>
  timeZone: string
  dateFormat: string
  onInfo: (message: WhatsAppMessage) => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const position = useRef({ height: 0, top: 0, nearBottom: true, first: 0, last: 0 })
  const [newMessages, setNewMessages] = useState(false)
  function toBottom() {
    const node = viewport.current
    if (!node) return
    node.scrollTop = node.scrollHeight
    position.current.nearBottom = true
    setNewMessages(false)
  }
  useLayoutEffect(() => {
    const node = viewport.current
    if (!node) return
    const first = timeline.items[0]?.sequence || 0
    const last = timeline.items.at(-1)?.sequence || 0
    const previous = position.current
    if (timeline.change === 'initial') toBottom()
    else if (first && previous.first && first < previous.first)
      node.scrollTop = previous.top + node.scrollHeight - previous.height
    else if (previous.nearBottom) toBottom()
    else if (last > previous.last) setNewMessages(true)
    position.current = {
      ...previous,
      height: node.scrollHeight,
      top: node.scrollTop,
      first,
      last,
      nearBottom: node.scrollHeight - node.scrollTop - node.clientHeight < 80,
    }
  }, [timeline.items, timeline.change])
  const dayKey = (value: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value))
  const dayLabel = (value: string) =>
    new Intl.DateTimeFormat('es-PE', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value))
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewport}
        data-chat-scroll
        className="h-full overflow-y-auto overscroll-contain bg-canvas px-4 py-4 sm:px-8"
        aria-label="Mensajes de la conversación"
        tabIndex={0}
        onScroll={(event) => {
          const node = event.currentTarget
          position.current.top = node.scrollTop
          position.current.height = node.scrollHeight
          position.current.nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 80
          if (position.current.nearBottom) setNewMessages(false)
          if (node.scrollTop < 40 && !timeline.loading) void timeline.loadOlder()
        }}
      >
        {timeline.error && (
          <div
            role="alert"
            className="error-box mb-4 flex flex-wrap items-center justify-between gap-2"
          >
            <span>{timeline.error}</span>
            <Button variant="quiet" onClick={timeline.refresh}>
              Reintentar
            </Button>
          </div>
        )}
        {timeline.loading ? (
          <p role="status" className="py-10 text-center text-sm text-muted">
            Cargando mensajes…
          </p>
        ) : timeline.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
            <MessagesSquare size={30} aria-hidden="true" />
            <p className="text-sm">No hay mensajes para mostrar.</p>
          </div>
        ) : (
          <>
            <div className="mb-3 text-center">
              {timeline.hasOlder ? (
                <Button
                  variant="quiet"
                  disabled={timeline.loadingOlder}
                  onClick={() => void timeline.loadOlder()}
                >
                  {timeline.loadingOlder ? 'Cargando…' : 'Ver mensajes anteriores'}
                </Button>
              ) : (
                <p className="py-3 text-xs text-muted">Inicio de la conversación</p>
              )}
            </div>
            <div className="space-y-3">
              {timeline.items.map(({ message }, index) => (
                <Fragment key={message.id}>
                  {(index === 0 ||
                    dayKey(message.createdAt) !==
                      dayKey(timeline.items[index - 1].message.createdAt)) && (
                    <p className="py-2 text-center">
                      <span className="rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-muted">
                        {dayLabel(message.createdAt)}
                      </span>
                    </p>
                  )}
                  <WhatsAppMessageContent
                    message={message}
                    timeZone={timeZone}
                    dateFormat={dateFormat}
                    onInfo={() => onInfo(message)}
                  />
                </Fragment>
              ))}
            </div>
          </>
        )}
      </div>
      {newMessages && (
        <div className="absolute right-4 bottom-4">
          <Button onClick={toBottom} className="shadow-lg">
            <ArrowDown size={16} />
            Nuevos mensajes
          </Button>
        </div>
      )}
    </div>
  )
}
