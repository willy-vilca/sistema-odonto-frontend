import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { InstallationState } from '../../features/installation/model/installation'
import { BrandMark } from '../../shared/ui/BrandMark'
import { Button } from '../../shared/ui/Button'
import { modules } from '../navigation'
import { SideNavigation } from './SideNavigation'

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark className="size-10 shrink-0 text-brand-700" />
      <div>
        <p className="font-display text-lg font-bold tracking-tight">OdontoCare</p>
        <p className="text-[11px] tracking-wide text-muted">GESTIÓN ODONTOLÓGICA</p>
      </div>
    </div>
  )
}

export function AppShell({ state, children }: { state: InstallationState; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const section =
    modules.find((module) => module.path === pathname)?.label ?? 'Página no encontrada'
  const clinicName = state.status === 'ready' ? state.data.displayName : 'Mi consultorio'
  const statusLabel =
    state.status === 'ready'
      ? 'Sistema conectado'
      : state.status === 'loading'
        ? 'Conectando…'
        : 'Sin conexión'
  useEffect(() => {
    const dialog = dialogRef.current
    if (menuOpen && !dialog?.open) dialog?.showModal()
    else if (!menuOpen && dialog?.open) dialog.close()
  }, [menuOpen])
  useEffect(() => {
    if (previousPath.current !== pathname) {
      mainRef.current?.focus()
      window.scrollTo(0, 0)
      previousPath.current = pathname
    }
    document.title = `${section} · OdontoCare`
  }, [pathname, section])
  return (
    <>
      <a
        href="#contenido"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-brand-800 px-4 py-3 text-white focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="px-7 py-8">
          <Brand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <SideNavigation />
        </div>
        <div className="mx-5 mb-5 rounded-xl border border-line bg-canvas p-4">
          <p className="text-xs font-semibold text-ink">Una base para crecer</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Primera entrega en desarrollo.
            <br />
            Avanzamos módulo por módulo.
          </p>
        </div>
      </aside>
      <dialog
        ref={dialogRef}
        onClose={() => setMenuOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
          )
          const first = controls[0]
          const last = controls.at(-1)
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMenuOpen(false)
        }}
        aria-label="Menú de navegación"
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-[min(320px,calc(100vw-32px))] max-w-none border-0 bg-white p-0 shadow-xl"
      >
        <div className="flex items-center justify-between gap-2 px-5 py-6">
          <Brand />
          <Button
            variant="quiet"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="px-3"
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        <SideNavigation onNavigate={() => setMenuOpen(false)} />
      </dialog>
      <div className="min-h-dvh lg:ml-64">
        <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-3 border-b border-line bg-white/95 px-5 backdrop-blur-md sm:px-8 xl:px-10">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="quiet"
              aria-label="Abrir menú"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="-ml-3 px-3 lg:hidden"
            >
              <Menu size={21} aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{clinicName}</p>
              <p className="text-xs text-muted">{section}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <div role="status" className="flex items-center gap-2 text-xs font-medium text-muted">
              <span
                className={`size-2 rounded-full ${state.status === 'ready' ? 'bg-brand-600' : state.status === 'error' ? 'bg-amber-600' : 'animate-pulse bg-slate-400'}`}
              />
              <span className="hidden sm:inline">{statusLabel}</span>
              <span className="sr-only sm:hidden">{statusLabel}</span>
            </div>
            <span className="hidden h-7 w-px bg-line sm:block" />
            <span
              className="flex size-10 items-center justify-center rounded-full border border-brand-100 bg-brand-50 text-xs font-bold text-brand-700"
              aria-label="Instalación local"
            >
              MC
            </span>
          </div>
        </header>
        <main
          id="contenido"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto max-w-7xl px-5 py-7 focus-visible:outline-none sm:px-8 sm:py-9 xl:px-10"
        >
          {children}
        </main>
        <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-5 pb-7 text-xs text-muted sm:flex-row sm:px-8 xl:px-10">
          <span>OdontoCare · Cuidado y gestión en un solo lugar</span>
          <span>Versión inicial 0.1 · Fase 0</span>
        </footer>
      </div>
    </>
  )
}
