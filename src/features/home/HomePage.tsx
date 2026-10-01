import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  HeartPulse,
  MessagesSquare,
  Settings2,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { InstallationState } from '../installation/model/installation'
import { ConnectionCard } from '../installation/components/ConnectionCard'
const pathways = [
  {
    path: '/agenda',
    title: 'Una agenda organizada',
    text: 'Citas y disponibilidad por odontólogo, sin cruces de horarios.',
    icon: CalendarDays,
    phase: 2,
  },
  {
    path: '/pacientes',
    title: 'Pacientes bien acompañados',
    text: 'Fichas e historial para dar continuidad a cada atención.',
    icon: UsersRound,
    phase: 2,
  },
  {
    path: '/conversaciones',
    title: 'Reservas desde WhatsApp',
    text: 'Un agente que conecta la conversación con la agenda.',
    icon: MessagesSquare,
    phase: 6,
  },
]
export function HomePage({ state, reload }: { state: InstallationState; reload: () => void }) {
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">ESPACIO DE TRABAJO</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[28px]">
            Bienvenido a tu consultorio
          </h1>
        </div>
        <span className="rounded-full border border-line bg-white px-3.5 py-2 text-xs font-medium text-muted">
          Configuración disponible · Fase 1
        </span>
      </div>
      <section
        aria-labelledby="welcome-title"
        className="relative overflow-hidden rounded-[20px] border border-[#dce6da] bg-[var(--clinic-accent,#edf2e9)] p-6 sm:p-9 lg:p-10"
      >
        <div className="relative z-1 max-w-xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-brand-700 uppercase">
            <HeartPulse size={16} aria-hidden="true" />
            Más tiempo para tus pacientes
          </p>
          <h2
            id="welcome-title"
            className="mt-5 max-w-lg text-3xl leading-tight font-semibold tracking-tight text-brand-800 sm:text-[40px]"
          >
            Un espacio para cuidar
            <br className="hidden sm:block" /> cada sonrisa.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#53664f] sm:text-[15px]">
            La atención, la agenda y las cuentas de tu consultorio, conectadas en una experiencia
            clara y cercana.
          </p>
          <Link
            to="/configuracion"
            className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Configurar mi consultorio
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <p className="mt-3 text-xs text-[#53664f]">
            Identidad, equipo y reglas de atención en un solo lugar.
          </p>
        </div>
        <div
          aria-hidden="true"
          className="absolute -right-16 -bottom-24 hidden size-[370px] rounded-full border-[45px] border-white/35 xl:block"
        >
          <div className="absolute inset-10 rounded-full border-[35px] border-white/50" />
        </div>
      </section>
      <section aria-labelledby="pathways-title">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pathways-title" className="text-lg font-semibold">
            Conoce tu espacio de trabajo
          </h2>
          <span className="text-xs text-muted">Módulos previstos para la primera entrega</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pathways.map(({ path, title, text, icon: Icon, phase }) => (
            <Link
              to={path}
              key={path}
              className="group flex flex-col rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand-600"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                  <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <ArrowUpRight
                  size={18}
                  className="text-muted group-hover:text-brand-700"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">{text}</p>
              <p className="mt-4 text-xs font-medium text-brand-700">
                Previsto para la fase {phase}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_1fr]">
        <ConnectionCard state={state} reload={reload} />
        <section
          aria-labelledby="next-title"
          className="rounded-2xl border border-line bg-white p-5 sm:p-6"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Settings2 size={16} aria-hidden="true" />
            TU CONSULTORIO
          </div>
          <h2 id="next-title" className="mt-3 text-lg font-semibold">
            Darle identidad a tu consultorio
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Configura cómo trabaja tu equipo antes de organizar las primeras citas.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              'Identidad, moneda y zona horaria',
              'Usuarios, roles y odontólogos',
              'Servicios, duración y horarios',
            ].map((text) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
                  <Check size={12} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">
            Esta vista presenta la base del sistema. Aún no registra pacientes, citas ni movimientos
            financieros.
          </p>
        </section>
      </div>
    </div>
  )
}
