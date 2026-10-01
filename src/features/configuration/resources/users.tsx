import { StatusBadge } from '../../../shared/ui/PagedTable'
import { roleOptions, permissionLabels, type ResourceDefinition } from '../model/resources'
export const usersResource: ResourceDefinition = {
  endpoint: '/api/v1/users',
  title: 'Usuarios',
  singular: 'usuario',
  description: 'Cuentas de acceso para tu equipo. Los roles definen las funciones disponibles.',
  read: 'USERS_READ',
  write: 'USERS_WRITE',
  defaults: {
    username: '',
    displayName: '',
    email: '',
    password: '',
    active: true,
    roles: ['RECEPTION'],
  },
  columns: [
    {
      label: 'Nombre',
      render: (r) => (
        <div>
          <p className="font-medium">{String(r.displayName)}</p>
          <p className="mt-1 text-xs text-muted">{String(r.username)}</p>
        </div>
      ),
    },
    {
      label: 'Roles',
      render: (r) =>
        (r.roles as string[])
          .map((code) => roleOptions.find((o) => o.value === code)?.label ?? code)
          .join(', '),
    },
    { label: 'Correo', render: (r) => String(r.email) || '—' },
    { label: 'Estado', render: (r) => <StatusBadge active={!!r.active} /> },
  ],
  fields: [
    { key: 'displayName', label: 'Nombre completo', required: true, maxLength: 120 },
    { key: 'username', label: 'Usuario', required: true, maxLength: 60 },
    { key: 'email', label: 'Correo electrónico', type: 'email', maxLength: 160 },
    {
      key: 'password',
      label: 'Contraseña',
      type: 'password',
      hint: 'Mínimo 10 caracteres. Al editar, dejar vacío conserva la contraseña.',
    },
    { key: 'roles', label: 'Roles del usuario', type: 'multi', options: roleOptions },
    { key: 'active', label: 'Usuario activo', type: 'checkbox' },
  ],
  prepare: (v, editing) => ({
    ...v,
    username: String(v.username).trim().toLowerCase(),
    password: editing && !v.password ? null : v.password,
  }),
  validate: (v) =>
    !v.roles || (v.roles as string[]).length === 0
      ? 'Selecciona al menos un rol.'
      : !v.id && !v.password
        ? 'Ingresa una contraseña para la nueva cuenta.'
        : v.password && new TextEncoder().encode(String(v.password)).length > 72
          ? 'La contraseña no puede superar 72 bytes.'
          : undefined,
}
export const rolesResource: ResourceDefinition = {
  endpoint: '/api/v1/roles',
  title: 'Roles y permisos',
  singular: 'rol',
  description:
    'Define qué puede consultar y gestionar cada rol. El administrador conserva el acceso completo.',
  read: 'ROLES_READ',
  write: 'ROLES_WRITE',
  defaults: {},
  keyFor: (r) => String(r.code),
  columns: [
    { label: 'Rol', render: (r) => String(r.name) },
    {
      label: 'Identificador',
      render: (r) => roleOptions.find((o) => o.value === r.code)?.label ?? String(r.code),
    },
    {
      label: 'Permisos',
      render: (r) => String((r.permissions as string[]).length) + ' funciones habilitadas',
    },
  ],
  fields: [
    { key: 'name', label: 'Nombre del rol', required: true, maxLength: 80 },
    {
      key: 'permissions',
      label: 'Funciones habilitadas',
      type: 'multi',
      options: Object.entries(permissionLabels).map(([value, label]) => ({ value, label })),
    },
  ],
  validate: (v) =>
    v.code === 'ADMIN' &&
    (v.permissions as string[]).length !== Object.keys(permissionLabels).length
      ? 'El administrador necesita conservar todos sus permisos.'
      : undefined,
}
