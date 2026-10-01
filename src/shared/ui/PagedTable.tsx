import type { ReactNode } from 'react'
import type { usePagedList } from '../data/usePagedList'
import { Button } from './Button'
export interface Column<T> {
  label: string
  render: (row: T) => ReactNode
}
export function PagedTable<T>({
  list,
  columns,
  keyFor,
  actions,
  filters,
}: {
  list: ReturnType<typeof usePagedList<T>>
  columns: Column<T>[]
  keyFor: (row: T) => string
  actions?: (row: T) => ReactNode
  filters?: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4 sm:p-5">
        <label className="field-label min-w-0 flex-1 basis-52">
          Buscar
          <input
            type="search"
            className="field"
            placeholder="Buscar por texto…"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
          />
        </label>
        {filters}
      </div>
      {list.error ? (
        <div className="p-6">
          <p role="alert" className="error-box">
            {list.error}
          </p>
          <Button className="mt-4" variant="secondary" onClick={list.reload}>
            Reintentar
          </Button>
        </div>
      ) : list.loading ? (
        <p role="status" className="p-7 text-sm text-muted">
          Cargando registros…
        </p>
      ) : !list.data?.items.length ? (
        <div className="p-10 text-center">
          <p className="font-semibold">Sin registros para mostrar</p>
          <p className="mt-2 text-sm text-muted">
            Añade un registro o ajusta la búsqueda y los filtros.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.label}
                      scope="col"
                      className="bg-canvas px-5 py-3 text-xs font-semibold text-muted"
                    >
                      {c.label}
                    </th>
                  ))}
                  {actions && (
                    <th scope="col" className="bg-canvas px-5 py-3 text-xs text-muted">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((row) => (
                  <tr key={keyFor(row)} className="border-t border-line">
                    {columns.map((c) => (
                      <td key={c.label} className="max-w-80 px-5 py-4 break-words">
                        {c.render(row)}
                      </td>
                    ))}
                    {actions && <td className="px-5 py-3">{actions(row)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-line md:hidden">
            {list.data.items.map((row) => (
              <article key={keyFor(row)} className="space-y-3 p-5">
                {columns.map((c) => (
                  <div key={c.label}>
                    <p className="text-xs font-medium text-muted">{c.label}</p>
                    <div className="mt-1 text-sm break-words">{c.render(row)}</div>
                  </div>
                ))}
                {actions?.(row)}
              </article>
            ))}
          </div>
        </>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line p-4 text-xs text-muted">
        <label className="flex items-center gap-2">
          Por página
          <select
            className="field w-20"
            aria-label="Por página"
            value={list.size}
            onChange={(e) => list.setSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <span role="status">
          {list.data?.totalElements ?? 0} registros · Página{' '}
          {(list.data?.totalPages ?? 0) === 0 ? 0 : list.page + 1} de {list.data?.totalPages ?? 0}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={list.loading || list.page === 0}
            onClick={() => list.setPage(list.page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            disabled={list.loading || list.page + 1 >= (list.data?.totalPages ?? 0)}
            onClick={() => list.setPage(list.page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </footer>
    </section>
  )
}
export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={active ? 'status-active' : 'status-inactive'}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}
