import { saveJson } from '../../../shared/api/http'
import type { AgentPolicy, Supervision } from '../model/supervision'
export function saveAgentPolicy(policy: AgentPolicy) {
  return saveJson<AgentPolicy>('/api/v1/whatsapp/agent/policy', policy, 'PUT')
}
export function changeAgentControl(id: string, mode: string, reason: string, generation: number) {
  return saveJson<Supervision>('/api/v1/whatsapp/conversations/' + id + '/control', {
    mode,
    reason,
    generation,
  })
}
