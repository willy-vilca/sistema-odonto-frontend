import { clinicalTemplatesResource, documentCategoriesResource } from './resources/clinical'
import { DocumentPolicyPage } from './DocumentPolicyPage'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/hooks/useAuth'
import { SettingsPage } from './SettingsPage'
import { AuditPage } from './AuditPage'
import { ResourcePage } from './components/ResourcePage'
import { usersResource, rolesResource } from './resources/users'
import { categoriesResource, servicesResource } from './resources/catalog'
import { dentistsResource } from './resources/dentists'
import { periodsResource, exceptionsResource } from './resources/schedules'
export function ConfigurationPage({
  onChanged,
  currency,
  timeZone,
  dateFormat,
}: {
  onChanged: () => void
  currency: string
  dateFormat: string
  timeZone: string
}) {
  const auth = useAuth(),
    tabs = [
      {
        path: 'consultorio',
        label: 'Consultorio',
        permission: 'SETTINGS_READ',
        element: <SettingsPage onChanged={onChanged} />,
      },
      {
        path: 'usuarios',
        label: 'Usuarios',
        permission: 'USERS_READ',
        element: <ResourcePage resource={usersResource} />,
      },
      {
        path: 'roles',
        label: 'Roles',
        permission: 'ROLES_READ',
        element: <ResourcePage resource={rolesResource} />,
      },
      {
        path: 'odontologos',
        label: 'Odontólogos',
        permission: 'DENTISTS_READ',
        element: <ResourcePage resource={dentistsResource} />,
      },
      {
        path: 'servicios',
        label: 'Servicios',
        permission: 'SERVICES_READ',
        element: <ResourcePage resource={servicesResource(currency)} />,
      },
      {
        path: 'categorias',
        label: 'Categorías',
        permission: 'SERVICES_READ',
        element: <ResourcePage resource={categoriesResource} />,
      },
      {
        path: 'horarios',
        label: 'Horarios',
        permission: 'SCHEDULES_READ',
        element: <ResourcePage resource={periodsResource} />,
      },
      {
        path: 'bloqueos',
        label: 'Bloqueos',
        permission: 'SCHEDULES_READ',
        element: <ResourcePage resource={exceptionsResource(dateFormat)} />,
      },
      {
        path: 'plantillas',
        label: 'Plantillas clínicas',
        permission: 'CLINICAL_CONFIG_READ',
        element: <ResourcePage resource={clinicalTemplatesResource} />,
      },
      {
        path: 'categorias-documentales',
        label: 'Categorías documentales',
        permission: 'CLINICAL_CONFIG_READ',
        element: <ResourcePage resource={documentCategoriesResource} />,
      },
      {
        path: 'almacenamiento',
        label: 'Archivos',
        permission: 'CLINICAL_CONFIG_READ',
        element: <DocumentPolicyPage />,
      },
      {
        path: 'auditoria',
        label: 'Auditoría',
        permission: 'AUDIT_READ',
        element: <AuditPage timeZone={timeZone} dateFormat={dateFormat} />,
      },
    ].filter((tab) => auth.can(tab.permission))
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted">
          ADMINISTRACIÓN DEL CONSULTORIO
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[28px]">Configuración</h1>
      </div>
      <nav
        aria-label="Secciones de configuración"
        className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={'/configuracion/' + tab.path}
            className={({ isActive }) =>
              'flex min-h-11 shrink-0 items-center rounded-lg px-4 text-sm ' +
              (isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-muted hover:bg-canvas')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route
          index
          element={
            tabs.length ? (
              <Navigate replace to={'/configuracion/' + tabs[0].path} />
            ) : (
              <p>No tienes acceso a estas funciones.</p>
            )
          }
        />
        {tabs.map((tab) => (
          <Route key={tab.path} path={tab.path} element={tab.element} />
        ))}
        <Route
          path="*"
          element={
            <p role="alert" className="error-box">
              Esta sección no está disponible para tu cuenta.
            </p>
          }
        />
      </Routes>
    </div>
  )
}
