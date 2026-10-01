import { useEffect } from 'react'
import { AuthProvider } from '../features/auth/AuthProvider'
import { useAuth } from '../features/auth/hooks/useAuth'
import { AccessPage } from '../features/auth/AccessPage'
import { AgendaPage } from '../features/appointments/AgendaPage'
import { PatientsPage } from '../features/patients/PatientsPage'
import { ConfigurationPage } from '../features/configuration/ConfigurationPage'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { HomePage } from '../features/home/HomePage'
import { ModulePreviewPage } from '../features/home/ModulePreviewPage'
import { ConnectionCard } from '../features/installation/components/ConnectionCard'
import { useInstallation } from '../features/installation/hooks/useInstallation'
import { AppShell } from './layout/AppShell'
import { modules } from './navigation'
export function App() {
  return (
    <AuthProvider>
      <Application />
    </AuthProvider>
  )
}
function Application() {
  const auth = useAuth()
  const { state, reload } = useInstallation()
  useEffect(() => {
    if (state.status !== 'ready') return
    const style = document.documentElement.style
    const brand = state.data.brandColor
    style.setProperty('--color-brand-700', brand)
    style.setProperty('--color-brand-600', brand)
    style.setProperty('--color-brand-800', 'color-mix(in srgb, ' + brand + ' 80%, black)')
    style.setProperty('--color-brand-50', 'color-mix(in srgb, ' + brand + ' 5%, white)')
    style.setProperty('--color-brand-100', 'color-mix(in srgb, ' + brand + ' 12%, white)')
    style.setProperty('--clinic-accent', state.data.accentColor)
  }, [state])
  if (!auth.session?.user) return <AccessPage />
  return (
    <BrowserRouter>
      <AppShell state={state}>
        <Routes>
          <Route path="/" element={<HomePage state={state} reload={reload} />} />
          <Route
            path="/configuracion/*"
            element={
              <ConfigurationPage
                onChanged={() => {
                  reload()
                  void auth.refresh()
                }}
                dateFormat={state.status === 'ready' ? state.data.dateFormat : 'DMY'}
                currency={state.status === 'ready' ? state.data.currency : 'PEN'}
                timeZone={state.status === 'ready' ? state.data.timeZone : 'America/Lima'}
              />
            }
          />
          <Route
            path="/agenda"
            element={
              state.status === 'ready' ? (
                <AgendaPage dateFormat={state.data.dateFormat} timeZone={state.data.timeZone} />
              ) : (
                <ConnectionCard state={state} reload={reload} />
              )
            }
          />
          <Route
            path="/pacientes"
            element={
              state.status === 'ready' ? (
                <PatientsPage dateFormat={state.data.dateFormat} timeZone={state.data.timeZone} />
              ) : (
                <ConnectionCard state={state} reload={reload} />
              )
            }
          />
          {modules
            .filter((module) => module.phase !== 0 && module.phase !== 1 && module.phase !== 2)
            .map((module) => (
              <Route
                key={module.path}
                path={module.path}
                element={<ModulePreviewPage module={module} />}
              />
            ))}
          <Route
            path="*"
            element={
              <div className="rounded-2xl border border-line bg-white p-8">
                <h1 className="text-2xl font-semibold">Página no encontrada</h1>
                <p className="mt-3 text-sm text-muted">
                  La dirección no corresponde a una sección del sistema.
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand-700"
                >
                  Volver al inicio
                </Link>
              </div>
            }
          />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
