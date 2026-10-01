import { getJson } from '../../../shared/api/http'
import type { Installation } from '../model/installation'
export async function getInstallation(signal: AbortSignal): Promise<Installation> {
  const installation = await getJson<Installation>('/api/v1/system/installation', signal)
  if (
    typeof installation.displayName !== 'string' ||
    typeof installation.timeZone !== 'string' ||
    typeof installation.currency !== 'string'
  ) {
    throw new Error('Invalid installation response')
  }
  return installation
}
