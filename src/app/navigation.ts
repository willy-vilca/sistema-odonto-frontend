import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardPlus,
  Home,
  MessagesSquare,
  Settings2,
  UsersRound,
  WalletCards,
} from 'lucide-react'
export const modules = [
  {
    path: '/',
    label: 'Inicio',
    icon: Home,
    group: 'Consultorio',
    phase: 0,
    description: 'Tu espacio de trabajo.',
  },
  {
    path: '/agenda',
    label: 'Agenda',
    icon: CalendarDays,
    group: 'Consultorio',
    phase: 2,
    description: 'Organiza las citas y la disponibilidad de cada odontólogo.',
    empty: 'Tu agenda comienza aquí',
    detail:
      'Las citas manuales y las reservas por WhatsApp compartirán las mismas reglas de disponibilidad. Cada servicio ocupará su duración completa.',
  },
  {
    path: '/pacientes',
    label: 'Pacientes',
    icon: UsersRound,
    group: 'Consultorio',
    phase: 2,
    description: 'Toda la información del paciente, en un solo lugar.',
    empty: 'Cada paciente, una historia',
    detail:
      'Aquí podrás gestionar fichas, contactos y responsables de menores, y acceder a las citas, atenciones y cuentas de cada paciente.',
  },
  {
    path: '/clinica',
    label: 'Historia clínica',
    icon: ClipboardPlus,
    group: 'Consultorio',
    phase: 3,
    description: 'Acompaña la evolución clínica con información organizada.',
    empty: 'Un registro para cada atención',
    detail:
      'Las atenciones, el odontograma y los documentos se integrarán a la ficha del paciente, conservando el historial de cambios.',
  },
  {
    path: '/finanzas',
    label: 'Finanzas',
    icon: WalletCards,
    group: 'Gestión',
    phase: 5,
    description: 'Cobros, cuotas y saldos con claridad.',
    empty: 'Cuentas claras, mejor seguimiento',
    detail:
      'Los cargos se originarán en servicios realizados o planes aceptados. Los abonos y cuotas conservarán su trazabilidad, sin duplicar deudas.',
  },
  {
    path: '/conversaciones',
    label: 'WhatsApp',
    icon: MessagesSquare,
    group: 'Gestión',
    phase: 6,
    description: 'Reservas y conversaciones conectadas con tu agenda.',
    empty: 'La próxima cita empieza con un mensaje',
    detail:
      'El agente consultará disponibilidad y registrará la reserva después de la confirmación del paciente. Cada acción quedará registrada para su revisión.',
  },
  {
    path: '/reportes',
    label: 'Reportes',
    icon: ChartNoAxesCombined,
    group: 'Gestión',
    phase: 8,
    description: 'Una visión clara de la actividad del consultorio.',
    empty: 'Información para decidir mejor',
    detail:
      'Podrás consultar citas, servicios, cobros, egresos y cuentas pendientes por periodo, utilizando los datos reales de tu consultorio.',
  },
  {
    path: '/configuracion',
    label: 'Configuración',
    icon: Settings2,
    group: 'Sistema',
    phase: 1,
    description: 'Un sistema que se adapta a tu consultorio.',
    empty: 'Tu consultorio, a tu manera',
    detail:
      'Configurarás identidad, usuarios, odontólogos, servicios y horarios. Cada instalación tendrá una sede y sus propios datos.',
  },
] as const
export type Module = (typeof modules)[number]
export const navigationGroups = ['Consultorio', 'Gestión', 'Sistema'] as const
