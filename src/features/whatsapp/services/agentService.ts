import { saveJson } from '../../../shared/api/http'
import type { AgentRun } from '../model/agent'
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
