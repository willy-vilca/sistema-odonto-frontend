import { notify } from '../../../shared/notifications/notifications'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { usePagedList } from '../../../shared/data/usePagedList'
import { PagedTable } from '../../../shared/ui/PagedTable'
import { Button } from '../../../shared/ui/Button'
import type { EntityRow, ResourceDefinition } from '../model/resources'
import { EntityEditor } from './EntityEditor'
export function ResourcePage({ resource }: { resource: ResourceDefinition }) {
  const auth = useAuth(),
    [active, setActive] = useState(''),
    [editor, setEditor] = useState<EntityRow | null | undefined>(undefined)
  const list = usePagedList<EntityRow>(
    resource.endpoint,
    resource.endpoint.endsWith('/roles') ? {} : { active },
    resource.sort,
  )
  const write = auth.can(resource.write)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{resource.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{resource.description}</p>
        </div>
        {write && resource.endpoint !== '/api/v1/roles' && (
          <Button
            onClick={() => {
              setEditor(null)
            }}
          >
            <Plus size={17} />
            Añadir {resource.singular}
          </Button>
        )}
      </div>
      <PagedTable
        list={list}
        columns={resource.columns}
        keyFor={resource.keyFor ?? ((row) => row.id)}
        actions={(row) => (
          <Button variant="quiet" onClick={() => setEditor(row)}>
            {write ? 'Editar' : 'Ver detalle'}
          </Button>
        )}
        filters={
          !resource.endpoint.endsWith('/roles') && (
            <label className="field-label w-40">
              Estado
              <select
                className="field"
                aria-label="Estado"
                value={active}
                onChange={(e) => setActive(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </label>
          )
        }
      />
      {editor !== undefined && (
        <EntityEditor
          key={editor?.id ?? (editor?.code as string) ?? 'new'}
          resource={resource}
          row={editor}
          editable={write}
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            setEditor(undefined)
            notify('Cambios guardados correctamente.')
            list.reload()
          }}
        />
      )}
    </div>
  )
}
