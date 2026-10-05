import { useRef, useState } from 'react'
import { useSaveForm } from '../../../shared/data/useSaveForm'
import { sendWhatsAppTestReply, sendWhatsAppText } from '../services/whatsappService'

export function useWhatsAppReply(conversationId: string, onSent: () => void) {
  const form = useSaveForm()
  const [body, setBody] = useState('')
  const textAttempt = useRef<{ body: string; key: string } | undefined>(undefined)
  const templateKey = useRef(crypto.randomUUID())
  function sendText() {
    const text = body.trim()
    if (!text || text.length > 1600 || form.busy) return
    if (!textAttempt.current || textAttempt.current.body !== text)
      textAttempt.current = { body: text, key: crypto.randomUUID() }
    const attempt = textAttempt.current
    void form.submit(
      () => sendWhatsAppText(conversationId, attempt.body, attempt.key),
      () => {
        setBody('')
        textAttempt.current = undefined
        onSent()
      },
    )
  }
  function sendTemplate() {
    if (form.busy) return
    void form.submit(
      () => sendWhatsAppTestReply(conversationId, templateKey.current),
      () => {
        templateKey.current = crypto.randomUUID()
        onSent()
      },
    )
  }
  return { busy: form.busy, body, setBody, sendText, sendTemplate }
}
