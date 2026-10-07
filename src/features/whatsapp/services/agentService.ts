import { saveJson } from '../../../shared/api/http'
import type { AgentRun } from '../model/agent'
import type { WhatsAppMessage } from '../model/whatsapp'
export function submitAgentTest(body: {
  phone: string
  contactName: string
  body: string
  requestKey: string
}) {
  return saveJson<{ conversationId: string; runId: string }>(
    '/api/v1/whatsapp/agent/test-messages',
    body,
  )
}
export function retryAgentRun(id: string) {
  return saveJson<AgentRun>('/api/v1/whatsapp/agent/runs/' + id + '/retry', {})
}
export function retryAgentReply(id: string) {
  return saveJson<WhatsAppMessage>('/api/v1/whatsapp/agent/runs/' + id + '/reply/retry', {})
}
