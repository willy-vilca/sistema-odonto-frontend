import { StatusBadge } from '../../../shared/ui/PagedTable'
import type { ResourceDefinition } from '../model/resources'
export const documentCategoriesResource: ResourceDefinition = {
  endpoint: '/api/v1/documents/categories',
  title: 'Categorías documentales',
  singular: 'categoría documental',
  description:
    'Organiza fotografías, radiografías, informes y copias de consentimiento. Desactivar una categoría conserva los documentos previos.',
  read: 'CLINICAL_CONFIG_READ',
  write: 'CLINICAL_CONFIG_WRITE',
  defaults: { version: 0, name: '', active: true },
  fields: [
    { key: 'name', label: 'Nombre de la categoría documental', required: true, maxLength: 120 },
    { key: 'active', label: 'Categoría documental activa', type: 'checkbox' },
  ],
  columns: [
    { label: 'Categoría', render: (row) => String(row.name) },
    { label: 'Estado', render: (row) => <StatusBadge active={!!row.active} /> },
  ],
}
