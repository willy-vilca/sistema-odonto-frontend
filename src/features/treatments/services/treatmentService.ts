import { request } from '../../../shared/api/http'
import type { Plan, PlanItem } from '../model/treatments'
import type { PageData } from '../../../shared/data/usePagedList'
export const getPlan = (id: string) => request<Plan>('/api/v1/plans/' + id)
export const getPlanItems = (id: string) =>
  request<PageData<PlanItem>>('/api/v1/plans/items?planId=' + id + '&size=100&sort=position')
export const getPlanItem = (id: string) => request<PlanItem>('/api/v1/plans/items/' + id)
export const getServicePrice = (id: string) =>
  request<{ price: number; name: string }>('/api/v1/services/' + id)
export const savePlan = (id: string | undefined, body: unknown) =>
  request<Plan>('/api/v1/plans' + (id ? '/' + id : ''), {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
export const planAction = (id: string, action: string, body: unknown) =>
  request<Plan>('/api/v1/plans/' + id + '/actions/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
export const addPlanItem = (id: string, body: unknown) =>
  request<Plan>('/api/v1/plans/' + id + '/additional', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
