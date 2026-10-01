import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { HomePage } from '../features/home/HomePage'
import { ModulePreviewPage } from '../features/home/ModulePreviewPage'
import { useInstallation } from '../features/installation/hooks/useInstallation'
import { AppShell } from './layout/AppShell'
import { modules } from './navigation'
export function App() {
  const { state, reload } = useInstallation()
  return (
    <BrowserRouter>
      <AppShell state={state}>
        <Routes>
          <Route path="/" element={<HomePage state={state} reload={reload} />} />
          {modules
            .filter((module) => module.phase !== 0)
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
