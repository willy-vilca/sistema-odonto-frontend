# OdontoCare — frontend

React + Vite + TypeScript + TailwindCSS. Fases 0 a 5: configuración, pacientes, agenda, clínica, documentación, presupuestos, planes, deuda, pagos, cuotas, egresos y caja. Adaptación para computadora, tablet y celular.

## Iniciar

Con Node compatible con Vite 8 y backend en 127.0.0.1:8080:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir http://127.0.0.1:5173. Detener con Ctrl+C. El proxy /api mantiene las sesiones en el mismo origen; no colocar secretos en variables VITE_. API_PROXY_TARGET cambia el destino de desarrollo y no se incorpora al cliente.

La primera instalación solicita crear una cuenta administradora. En Configuración, completar identidad, categorías y servicios; crear usuarios con rol odontólogo, vincular sus fichas y asignar servicios y jornadas. Las pestañas y acciones disponibles dependen de permisos verificados también por el servidor.

Listas y selectores solicitan páginas al backend. La búsqueda espera 250 ms, cancela solicitudes obsoletas y vuelve a la primera página al cambiar filtros. Las tablas se convierten en tarjetas en celular. Los formularios conservan valores ante errores, se cierran con Escape y devuelven el foco al control de apertura.

Los resultados de las acciones se muestran como notificaciones flotantes: éxito durante 5 segundos y error durante 8 segundos, con cierre manual y pausa mediante foco o puntero sobre su botón. Funcionan dentro de los formularios abiertos y permiten seguir operando sus controles. Se conservan las validaciones de campo y los errores persistentes de carga o permisos.

## Organización

- app: composición, navegación, disposición y estilos.
- features/auth: contexto, contratos, acceso y hook de sesión.
- features/configuration: pantallas y definiciones por módulo, con sus campos y validaciones.
- features/installation y home: identidad e inicio.
- features/patients: fichas, contactos, responsables, servicios HTTP y formularios.
- features/appointments: calendario, lista, reserva, disponibilidad, estados e historial.
- shared/api: HTTP, CSRF y errores.
- shared/data: consultas paginadas y formatos.
- shared/ui: botones, modal, tabla, selector remoto y presentación de notificaciones reutilizables.
- shared/notifications: avisos de acciones, cierre, temporizadores y contexto del diálogo activo.

Las reglas de negocio se validan en el backend. Las vistas de módulos futuros no simulan citas, cobros ni mensajes de WhatsApp.

## Comprobar

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run format:check
```

Para navegador, preparar sistema_odontologo_test y arrancar el backend de pruebas según su README. Después, desde frontend:

```powershell
./scripts/prepare-e2e.ps1
npm.cmd run test:e2e
```

Preparar la base antes de la batería completa. El script verifica su nombre exacto. Backend en 8081; Playwright inicia Vite en 5174 y usa Chrome instalado. Se crea el primer administrador desde la interfaz; cada prueba usa una sesión independiente. Credenciales aleatorias en .runtime, sin versionar. No preparar la base mientras otra verificación la utiliza.

Se comprueban flujos completos, teclado, Axe, permisos, errores y solicitudes paginadas. Tamaños: 1440×900, 1280×800, 1024×768, 768×1024, 390×844 y 360×800. Trazas fallidas en test-results; capturas revisadas en docs/verification/phase1, phase2 y phase3.

Guías vigentes: alcance y plan en ../docs, más ../AGENTS.md. Instantáneas versionadas y cierres de fase: backend/docs/project.

## Uso de pacientes y agenda

En Pacientes, crear una ficha por persona. Registrar teléfonos internacionales con prefijo +. Los familiares pueden compartir teléfono, pero cada cita selecciona explícitamente su paciente. Para menores, marcar un contacto como responsable. Las fichas provisionales se completan después y desactivar conserva la información.

Agenda permite Día, Semana, Mes y Lista; en celular se abre Lista. Filtrar por odontólogo; la lista incluye fechas, estado, búsqueda y paginación remotas. Nueva cita solicita paciente, profesional y servicio asignado, o un motivo administrativo con duración. El inicio y fin utilizan la zona del consultorio, incluso si el navegador tiene otra zona. Consultar Detalle para confirmar, cambiar estado, reprogramar y cancelar. Los cambios registran motivo e historial; una reprogramación rechazada conserva la reserva original.

En reprogramación, la duración anterior se conserva salvo que se marque Usar la duración actual del catálogo. La cancelación libera el intervalo. Los estados de asistencia se habilitan cuando ha llegado la hora de la cita. WhatsApp y la reserva mediante IA se incorporarán en la fase 6.

## Uso del expediente clínico

Abrir Historia clínica o el enlace Abrir expediente clínico de la ficha. Seleccionar paciente y odontólogo responsable. Cada sección conserva permisos y sus listados se consultan con búsqueda, filtros y paginación remotos.

Atenciones: guardar borrador, consultar, finalizar y registrar una corrección con motivo. Consultar versión 1 recupera el original; las versiones siguientes muestran la corrección, responsable y fecha. Evolución y diagnóstico se requieren al finalizar. No se genera deuda en fase 3.

Antecedentes: registrar información referida, guardar un nuevo estado y consultar los anteriores. Odontograma: elegir dentición y pieza, registrar hallazgos de superficies o pieza completa, indicar fecha y motivo y guardar. Las superficies vacías permanecen Sin registrar. Las plantillas configuradas añaden texto revisable por el profesional.

Archivos: adjuntar en categoría y fecha, con descripción y pieza/atención opcionales. Elegir dos fotografías para compararlas. Ver archivo abre el original de imagen o una vista paginada del PDF renderizada por el servidor; Descargar original recupera el archivo almacenado. Los PDF se visualizan como páginas de imagen para funcionar sin un plugin de PDF en el dispositivo.

Consentimientos: adjuntar primero su copia, luego registrar nombre, responsable, relación y fecha; seleccionar exclusivamente una copia del mismo paciente. Configuración permite editar plantillas, categorías y límite de archivos. No hay firma electrónica.

## Presupuestos, planes y deuda

Presupuestos y planes permite seleccionar paciente, crear tratamientos con precio, unidades, sesiones y pieza, presentar la oferta y registrar aceptación explícita. Editar una propuesta la devuelve a borrador. Los adicionales y ajustes conservan el acuerdo original; cancelar puede mantener deuda o liberar lo pendiente con permiso de ajustes. Finalizar requiere completar sesiones.

En la atención clínica, seleccionar un concepto del plan vincula el avance sin otro cargo. Servicio y pieza se conservan desde ese concepto; la cantidad indica sesiones realizadas. Un procedimiento individual utiliza precio acordado o de catálogo y genera un cargo al finalizar. Las correcciones clínicas conservan los movimientos financieros; una diferencia económica necesita un ajuste.

Finanzas muestra deuda por paciente y moneda, cargos, ajustes, motivos y responsables. Ver origen consulta cargo y movimientos relacionados; los enlaces clínicos recuperan la atención específica. La ficha del paciente enlaza planes y deuda según permisos. Los documentos pueden asociarse con el tratamiento del mismo paciente.

Esta fase no registra pagos ni dinero recibido. Las atenciones finalizadas antes de fase 4 conservan su historia sin cargos retroactivos. Consultar las guías y el cierre de fase 4 en ../docs. Capturas sintéticas de computadora, tablet y celular: docs/verification/phase4.

## Finanzas · Fase 5

Finanzas permite elegir paciente y consultar deuda generada, recibido neto, aplicado, pendiente y anticipo. Cuenta del paciente separa Cargos, Pagos, Cuotas y Archivos. Registrar abono permite elegir varios cargos mediante búsqueda paginada; dejarlo sin aplicación conserva un anticipo. Ver movimiento muestra aplicaciones, constancia y sustentos. Administración puede liberar, devolver o revertir con motivo, conceder descuentos y anular cargos conservando originales.

Programar cuotas desde un cargo distribuye su total neto; el dinero ya aplicado cubre los primeros vencimientos. Un cambio de cargo marca el calendario para revisión. Egresos conserva categoría, proveedor opcional, medio y sustento. Caja muestra fondo inicial, efectivo esperado y otros medios aparte; cierre exige contado y motivo y genera un arqueo PDF histórico.

Los documentos se recuperan a demanda, admiten vista por página y zoom de 100 % a 400 %, y se descargan con permisos. Los formularios, listados y cajas se usan con teclado y controles táctiles, en 1440×900, 768×1024 y 390×844. Las listas siguen paginadas/filtradas/buscadas desde el servidor.

Comprobación: tests/phase5.spec.ts incluye 11 escenarios nuevos; la regresión conjunta suma 48 escenarios. Capturas en docs/verification/phase5. Requisitos y resultados en las guías maestras de la raíz y sus instantáneas backend/docs/project. WhatsApp real permanece pendiente de fase 6.

## Ajustes previos a la revisión general

02/10/2026: selección de servicios corregida mediante consulta individual autorizada. La descripción y el precio se completan automáticamente; el precio sigue editable y el guardado espera a que termine la consulta. La interfaz usa Tratamiento en presupuestos y Plan de tratamiento en la vinculación clínica. Se incorporaron avisos flotantes compartidos sin dependencias adicionales. Regresión final: 52 escenarios de navegador aprobados. Alcance 1.3 y plan 1.7; resultados en ../docs/ajustes-previos-fase-6.md y capturas en docs/verification/adjustments. La integración de WhatsApp continúa pendiente de fase 6.
