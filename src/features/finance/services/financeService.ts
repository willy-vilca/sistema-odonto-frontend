import { saveJson } from '../../../shared/api/http'
export const adjustCharge = (id: string, body: unknown) =>
  saveJson('/api/v1/charges/' + id + '/adjustments', body)
