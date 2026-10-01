# OdontoCare — frontend

React + Vite + TypeScript + TailwindCSS. Fases 0 y 1: acceso, consultorio personalizable, administración por permisos y formularios de equipo, catálogo, horarios y auditoría. Adaptación para computadora, tablet y celular.

## Iniciar

Con Node compatible con Vite 8 y backend en 127.0.0.1:8080:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir http://127.0.0.1:5173. Detener con Ctrl+C. El proxy /api mantiene las sesiones en el mismo origen; no colocar secretos en variables VITE_. API_PROXY_TARGET cambia el destino de desarrollo y no se incorpora al cliente.

La primera instalación solicita crear una cuenta administradora. En Configuración, completar identidad, categorías y servicios; crear usuarios con rol odontólogo, vincular sus fichas y asignar servicios y jornadas. Las pestañas y acciones disponibles dependen de permisos verificados también por el servidor.

Listas y selectores solicitan páginas al backend. La búsqueda espera 250 ms, cancela solicitudes obsoletas y vuelve a la primera página al cambiar filtros. Las tablas se convierten en tarjetas en celular. Los formularios conservan valores ante errores, se cierran con Escape y devuelven el foco al control de apertura.

## Organización

- app: composición, navegación, disposición y estilos.
- features/auth: contexto, contratos, acceso y hook de sesión.
- features/configuration: pantallas y definiciones por módulo, con sus campos y validaciones.
- features/installation y home: identidad e inicio.
- shared/api: HTTP, CSRF y errores.
- shared/data: consultas paginadas y formatos.
- shared/ui: botones, modal, tabla y selector remoto reutilizables.

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

Se comprueban flujos completos, teclado, Axe, permisos, errores y solicitudes paginadas. Tamaños: 1440×900, 1280×800, 1024×768, 768×1024, 390×844 y 360×800. Trazas fallidas en test-results; capturas revisadas en docs/verification/phase1.

Guías vigentes: alcance y plan en ../docs, más ../AGENTS.md. Instantáneas versionadas y cierres de fase: backend/docs/project.
