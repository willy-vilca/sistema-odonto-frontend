import { StatusBadge } from '../../../shared/ui/PagedTable'
import type { ResourceDefinition } from '../model/resources'
export const clinicalTemplatesResource: ResourceDefinition = {
  endpoint: '/api/v1/clinical/templates',
  title: 'Plantillas clínicas',
  singular: 'plantilla clínica',
  description:
    'Textos básicos para anamnesis, atención y consentimientos. Aplicar una plantilla añade texto; el profesional revisa el contenido.',
  read: 'CLINICAL_CONFIG_READ',
  write: 'CLINICAL_CONFIG_WRITE',
  defaults: { version: 0, name: '', kind: 'ENCOUNTER', content: '', active: true },
  fields: [
    { key: 'name', label: 'Nombre de la plantilla', required: true, maxLength: 120 },
    {
      key: 'kind',
      label: 'Uso de la plantilla',
      type: 'select',
      required: true,
      options: [
        { value: 'ENCOUNTER', label: 'Atención' },
        { value: 'BACKGROUND', label: 'Antecedentes' },
        { value: 'CONSENT', label: 'Consentimiento' },
      ],
    },
    { key: 'content', label: 'Contenido de la plantilla', type: 'textarea', maxLength: 12000 },
    { key: 'active', label: 'Plantilla activa', type: 'checkbox' },
  ],
  columns: [
    { label: 'Plantilla', render: (row) => String(row.name) },
    {
      label: 'Uso',
      render: (row) =>
        ({ ENCOUNTER: 'Atención', BACKGROUND: 'Antecedentes', CONSENT: 'Consentimiento' })[
          String(row.kind)
        ] ?? '',
    },
    { label: 'Estado', render: (row) => <StatusBadge active={!!row.active} /> },
  ],
}
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
