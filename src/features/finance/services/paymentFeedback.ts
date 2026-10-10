import { request } from '../../../shared/api/http'
import { notify } from '../../../shared/notifications/notifications'
import type { Allocation, OpenCharge } from '../model/payments'
export async function notifyPaidCharges(rows: Allocation[]) {
  const results = await Promise.allSettled(
    rows.map((row) => request<OpenCharge>('/api/v1/finance/charges/' + row.chargeId)),
  )
  const paid = results.filter(
    (r) => r.status === 'fulfilled' && !r.value.closed && Number(r.value.pending) === 0,
  ).length
  if (paid)
    notify(
      paid === 1
        ? 'El cargo está pagado completamente. Puedes finalizarlo desde Cargos.'
        : `${paid} cargos están pagados completamente. Puedes finalizarlos desde Cargos.`,
    )
}
