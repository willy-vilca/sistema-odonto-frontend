import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, request } from '../../../shared/api/http'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import type { Supervision } from '../model/supervision'
import { changeAgentControl } from '../services/supervisionService'

const reasons: Record<string, string> = {
  HUMAN: 'Atención manual desde la conversación',
  AUTO: 'Atención manual finalizada; devolver al asistente',
  CLOSED: 'Conversación finalizada por recepción',
}
export function useConversationControl(id: string, enabled: boolean) {
  const [data, setData] = useState<Supervision>()
  const [error, setError] = useState<string>()
  const form = useSaveForm()
  const controller = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    if (!enabled) return
    controller.current?.abort()
    const active = new AbortController()
    controller.current = active
    try {
      const value = await request<Supervision>(`/api/v1/whatsapp/conversations/${id}/supervision`, {
        signal: active.signal,
      })
      if (!active.signal.aborted) {
        setData(value)
        setError(undefined)
      }
    } catch (e) {
      if (!active.signal.aborted) setError(errorMessage(e))
    }
  }, [id, enabled])
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, 5000)
    return () => {
      controller.current?.abort()
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [refresh])
  function change(mode: string) {
    if (!data || form.busy) return
    void form.submit(
      () => changeAgentControl(id, mode, reasons[mode], data.generation),
      () => {
        void refresh()
      },
    )
  }
  return { data, error, busy: form.busy, refresh, change }
}
