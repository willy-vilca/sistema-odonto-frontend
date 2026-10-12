import { useQueryData } from '../../../shared/data/useQueryData'
import { useAuth } from '../../auth/hooks/useAuth'
import type { PickedEntity } from '../../../shared/ui/EntityPicker'

export function useSoleDentist() {
  const auth = useAuth()
  const state = useQueryData<{ items: { id: string; fullName: string }[]; totalElements: number }>(
    auth.can('DENTISTS_READ') ? '/api/v1/dentists?active=true&page=0&size=2' : undefined,
  )
  const dentist = state.data?.totalElements === 1 ? state.data.items[0] : undefined
  const selection: PickedEntity[] = dentist ? [{ id: dentist.id, label: dentist.fullName }] : []
  return { selection, loading: state.loading, error: state.error }
}
