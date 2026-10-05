import { StatusBadge } from '../../../shared/ui/PagedTable'
import { serviceSource, type ResourceDefinition } from '../model/resources'
import { DentistServices } from '../components/DentistServices'
export const dentistsResource: ResourceDefinition = {
  endpoint: '/api/v1/dentists',
  title: 'Odontólogos',
  singular: 'odontólogo',
  description:
    'Vincula cada profesional con su cuenta y los servicios que realiza. La agenda se organizará por odontólogo.',
  read: 'DENTISTS_READ',
  write: 'DENTISTS_WRITE',
  defaults: {
    userId: null,
    fullName: '',
    licenseNumber: '',
    specialty: '',
    active: true,
    serviceIds: [],
  },
  fields: [
    { key: 'fullName', label: 'Nombre del profesional', required: true },
    { key: 'licenseNumber', label: 'Registro profesional', required: true, maxLength: 40 },
    { key: 'specialty', label: 'Especialidad', maxLength: 120 },
    {
      key: 'userId',
      label: 'Cuenta del odontólogo',
      type: 'picker',
      required: true,
      source: { endpoint: '/api/v1/dentists/eligible-users', labelKey: 'displayName' },
      selected: (r) => [{ id: String(r.userId), label: String(r.userName) }],
    },
    {
      key: 'serviceIds',
      label: 'Servicios habilitados',
      type: 'picker',
      source: serviceSource,
      multiple: true,
      selected: (r) =>
        Object.entries(r.services as Record<string, string>).map(([id, label]) => ({ id, label })),
    },
    { key: 'active', label: 'Profesional activo', type: 'checkbox' },
  ],
  prepare: (v) => ({
    ...v,
    serviceIds: v.serviceIds ?? Object.keys((v.services as Record<string, string>) ?? {}),
  }),
  validate: (v) =>
    !v.userId
      ? 'Selecciona la cuenta del profesional.'
      : (v.serviceIds as string[])?.length > 100
        ? 'Puedes asignar hasta 100 servicios.'
        : undefined,
  columns: [
    {
      label: 'Profesional',
      render: (r) => (
        <div>
          <p className="font-medium">{String(r.fullName)}</p>
          <p className="mt-1 text-xs text-muted">{String(r.specialty) || 'Odontología general'}</p>
        </div>
      ),
    },
    { label: 'Registro', render: (r) => String(r.licenseNumber) },
    { label: 'Cuenta', render: (r) => String(r.userName) },
    {
      label: 'Servicios asignados',
      render: (r) => <DentistServices dentist={r} />,
    },
    { label: 'Estado', render: (r) => <StatusBadge active={!!r.active} /> },
  ],
}
