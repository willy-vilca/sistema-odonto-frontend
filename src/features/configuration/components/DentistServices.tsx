import { useState } from 'react'
import { usePagedList } from '../../../shared/data/usePagedList'
import { Modal } from '../../../shared/ui/Modal'
import { Button } from '../../../shared/ui/Button'
import { PagedTable, StatusBadge } from '../../../shared/ui/PagedTable'
import type { EntityRow } from '../model/resources'

interface AssignedService {
  id: string
  name: string
  active: boolean
}

function AssignedServicesDialog({ dentist, onClose }: { dentist: EntityRow; onClose: () => void }) {
  const [active, setActive] = useState('')
  const list = usePagedList<AssignedService>(`/api/v1/dentists/${dentist.id}/services`, { active })
  return (
    <Modal title="Servicios del odontólogo" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm font-medium">{String(dentist.fullName)}</p>
        <p className="text-sm text-muted">
          Consulta los servicios asociados, incluidos los inactivos.
        </p>
        <PagedTable
          list={list}
          keyFor={(service) => service.id}
          columns={[
            { label: 'Servicio', render: (service) => service.name },
            { label: 'Estado', render: (service) => <StatusBadge active={service.active} /> },
          ]}
          filters={
            <label className="field-label">
              Estado del servicio
              <select className="field" value={active} onChange={(e) => setActive(e.target.value)}>
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </label>
          }
        />
        <Button type="button" variant="secondary" onClick={onClose}>
          Volver a odontólogos
        </Button>
      </div>
    </Modal>
  )
}

export function DentistServices({ dentist }: { dentist: EntityRow }) {
  const [open, setOpen] = useState(false)
  const services = Object.values(dentist.services as Record<string, string>).sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
  if (!services.length) return <span className="text-muted">Sin servicios</span>
  return (
    <div className="min-w-0 space-y-2">
      <ul className="max-w-64 space-y-1 text-sm" aria-label="Resumen de servicios asignados">
        {services.slice(0, 3).map((name) => (
          <li key={name} className="truncate" title={name}>
            {name}
          </li>
        ))}
      </ul>
      {services.length > 3 && <p className="text-xs text-muted">Y {services.length - 3} más</p>}
      <Button
        type="button"
        variant="quiet"
        aria-label={`Ver servicios de ${String(dentist.fullName)}`}
        onClick={() => setOpen(true)}
      >
        Ver servicios ({services.length})
      </Button>
      {open && <AssignedServicesDialog dentist={dentist} onClose={() => setOpen(false)} />}
    </div>
  )
}
