import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, request } from '../../../shared/api/http'
import type { ChatItem, ChatPage } from '../model/whatsapp'

interface TimelineState {
  key?: string
  items: ChatItem[]
  loading: boolean
  loadingOlder: boolean
  hasOlder: boolean
  error?: string
  change: 'initial' | 'older' | 'live'
}
const empty: TimelineState = {
  items: [],
  loading: true,
  loadingOlder: false,
  hasOlder: false,
  change: 'initial',
}

/** Only requested cursor pages are cached. Filtering and page boundaries belong to the server. */
export function useChatTimeline(id: string, search: string, direction: string, status: string) {
  const [state, setState] = useState<TimelineState>(empty)
  const [revision, setRevision] = useState(0)
  const key = [id, search, direction, status, revision].join('|')
  const session = useRef<{
    controller: AbortController
    items: ChatItem[]
    hasOlder: boolean
    polling: boolean
    older: boolean
    read: (cursor?: { before?: number; after?: number }) => Promise<ChatPage>
    poll: () => Promise<void>
  } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ size: '30', search, messageDirection: direction, status })
    const current = {
      controller,
      items: [] as ChatItem[],
      hasOlder: false,
      polling: false,
      older: false,
      read: (cursor: { before?: number; after?: number } = {}) =>
        request<ChatPage>(
          `/api/v1/whatsapp/conversations/${id}/timeline?${query}&${new URLSearchParams(
            Object.entries(cursor).map(([key, value]) => [key, String(value)]),
          )}`,
          { signal: controller.signal },
        ),
      poll: async () => {},
    }
    session.current = current
    function publish(page: ChatPage, change: TimelineState['change']) {
      const merged = new Map(current.items.map((item) => [item.message.id, item]))
      page.items.forEach((item) => merged.set(item.message.id, item))
      current.items = [...merged.values()].sort((a, b) => a.sequence - b.sequence)
      if (!controller.signal.aborted)
        setState({
          key,
          items: current.items,
          loading: false,
          loadingOlder: current.older,
          hasOlder: current.hasOlder,
          change,
        })
    }
    current.poll = async () => {
      if (current.polling || controller.signal.aborted) return
      current.polling = true
      try {
        const last = current.items.at(-1)?.sequence
        const page = await current.read(last ? { after: last } : {})
        if (last === undefined) current.hasOlder = page.hasMore
        publish(page, last === undefined ? 'initial' : 'live')
        // Once caught up, refresh recent delivery states too. A busy chat catches up one bounded page per tick.
        if (last !== undefined && !page.hasMore) publish(await current.read(), 'live')
      } catch (error) {
        if (!controller.signal.aborted)
          setState((s) => ({
            ...(s.key === key ? s : empty),
            key,
            loading: false,
            error: errorMessage(error),
          }))
      } finally {
        current.polling = false
      }
    }
    void current.poll()
    const timer = window.setInterval(() => {
      // Search results are a server snapshot; refresh explicitly instead of filtering cached messages.
      if (!document.hidden && !search && !direction && !status) void current.poll()
    }, 5000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [id, search, direction, status, revision, key])

  const loadOlder = useCallback(async () => {
    const current = session.current
    const first = current?.items[0]?.sequence
    if (!current || !first || !current.hasOlder || current.older) return
    current.older = true
    setState((s) => ({ ...s, loadingOlder: true }))
    try {
      const page = await current.read({ before: first })
      if (current.controller.signal.aborted) return
      current.hasOlder = page.hasMore
      const merged = new Map(current.items.map((item) => [item.message.id, item]))
      page.items.forEach((item) => merged.set(item.message.id, item))
      current.items = [...merged.values()].sort((a, b) => a.sequence - b.sequence)
      setState({
        key,
        items: current.items,
        loading: false,
        loadingOlder: false,
        hasOlder: current.hasOlder,
        change: 'older',
      })
    } catch (error) {
      if (!current.controller.signal.aborted)
        setState((s) => ({ ...s, loadingOlder: false, error: errorMessage(error) }))
    } finally {
      current.older = false
    }
  }, [key])
  const refresh = useCallback(() => {
    if (search || direction || status) setRevision((r) => r + 1)
    else void session.current?.poll()
  }, [search, direction, status])
  return { ...(state.key === key ? state : empty), loadOlder, refresh }
}
