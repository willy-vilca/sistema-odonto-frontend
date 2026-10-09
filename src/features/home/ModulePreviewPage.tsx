import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Module } from '../../app/navigation'
export function ModulePreviewPage({ module }: { module: Exclude<Module, { phase: 0 }> }) {
  const Icon = module.icon
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-muted">ESPACIO DE TRABAJO</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[28px]">
          {module.label}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">{module.description}</p>
      </div>
      <section className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-line bg-white px-6 py-12 text-center">
        <div className="relative">
          <span className="flex size-20 items-center justify-center rounded-[24px] bg-brand-50 text-brand-700">
            <Icon size={34} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="absolute -right-2 -bottom-1 rounded-full border-4 border-white bg-canvas p-2 text-muted">
            <LockKeyhole size={14} aria-hidden="true" />
          </span>
        </div>
        <h2 className="mt-7 text-xl font-semibold sm:text-2xl">Opción no disponible</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-muted">
          Esta opción no está habilitada en tu instalación.
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-semibold hover:bg-brand-50"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al inicio
        </Link>
      </section>
    </div>
  )
}
