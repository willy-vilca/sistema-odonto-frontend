import { saveJson } from '../../../shared/api/http'
import type { WhatsAppMessage } from '../model/whatsapp'

export function sendWhatsAppText(conversationId: string, body: string, requestKey: string) {
  return saveJson<WhatsAppMessage>(
    '/api/v1/whatsapp/conversations/' + conversationId + '/messages',
    { body, requestKey },
  )
}

export function sendWhatsAppTestReply(conversationId: string, requestKey: string) {
  return saveJson<WhatsAppMessage>(
    '/api/v1/whatsapp/conversations/' + conversationId + '/test-reply',
    { requestKey },
  )
}
