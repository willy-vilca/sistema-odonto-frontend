import { StatusBadge } from '../../../shared/ui/PagedTable'
import type { ResourceDefinition } from '../model/resources'
export const categoriesResource: ResourceDefinition = {
  endpoint: '/api/v1/categories',
  title: 'Categorías',
  singular: 'categoría',
  description:
    'Organiza los servicios por tipo de atención. Una categoría con servicios activos se conserva habilitada.',
  read: 'SERVICES_READ',
  write: 'SERVICES_WRITE',
  defaults: { name: '', active: true },
  fields: [
    { key: 'name', label: 'Nombre de la categoría', required: true, maxLength: 100 },
    { key: 'active', label: 'Categoría activa', type: 'checkbox' },
  ],
  columns: [
    { label: 'Categoría', render: (r) => String(r.name) },
    { label: 'Estado', render: (r) => <StatusBadge active={!!r.active} /> },
  ],
}
export function servicesResource(currency: string): ResourceDefinition {
  return {
    endpoint: '/api/v1/services',
    title: 'Servicios',
    singular: 'servicio',
    description:
      'Precios y duraciones para futuras atenciones y reservas. Desactivar un servicio conserva sus registros y asignaciones.',
    read: 'SERVICES_READ',
    write: 'SERVICES_WRITE',
    defaults: {
      name: '',
      categoryId: null,
      price: 0,
      durationMinutes: 30,
      description: '',
      bookableByAgent: false,
      active: true,
    },
    fields: [
      { key: 'name', label: 'Nombre del servicio', required: true },
      {
        key: 'categoryId',
        label: 'Categoría',
        type: 'picker',
        required: true,
        source: { endpoint: '/api/v1/categories', labelKey: 'name', filters: { active: 'true' } },
        selected: (r) => [{ id: String(r.categoryId), label: String(r.categoryName) }],
      },
      {
        key: 'price',
        label: 'Precio (' + currency + ')',
        type: 'number',
        required: true,
        min: 0,
        max: 9999999999.99,
        step: 0.01,
      },
      {
        key: 'durationMinutes',
        label: 'Duración en minutos',
        type: 'number',
        required: true,
        min: 1,
        max: 1440,
        step: 1,
      },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'bookableByAgent', label: 'Permitir reserva automática', type: 'checkbox' },
      { key: 'active', label: 'Servicio activo', type: 'checkbox' },
    ],
    validate: (v) => (!v.categoryId ? 'Selecciona una categoría.' : undefined),
    columns: [
      {
        label: 'Servicio',
        render: (r) => (
          <div>
            <p className="font-medium">{String(r.name)}</p>
            <p className="mt-1 text-xs text-muted">{String(r.categoryName)}</p>
          </div>
        ),
      },
      {
        label: 'Precio',
        render: (r) =>
          new Intl.NumberFormat('es-PE', {
            style: 'currency',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            currency,
          }).format(Number(r.price)),
      },
      { label: 'Duración', render: (r) => String(r.durationMinutes) + ' min' },
      {
        label: 'Reserva automática',
        render: (r) => (r.bookableByAgent ? 'Habilitada' : 'Deshabilitada'),
      },
      { label: 'Estado', render: (r) => <StatusBadge active={!!r.active} /> },
    ],
  }
}
