# OdontoCare — frontend

Interfaz del sistema odontológico configurable. Fase 0: estructura visual responsiva, navegación, vistas informativas de módulos futuros y consulta real de la identidad del consultorio. Agenda, pacientes, historia clínica, finanzas y WhatsApp se implementan en sus fases; estas vistas no realizan operaciones de negocio.

React 19, Vite 8, TypeScript 6 y TailwindCSS 4. React Router para navegación, Lucide para iconos y fuentes locales DM Sans/Manrope. `package-lock.json` conserva las versiones resueltas. Se utiliza fetch y hooks de React para el recurso inicial, sin una librería adicional de estado.

## Iniciar y detener en Windows

Requisitos: Node.js 22.12+ (o 20.19+) y npm. Entorno verificado: Node 24.16.0. El backend y PostgreSQL deben estar activos para ver la información del consultorio.

En una terminal de backend:

```powershell
.\mvnw.cmd spring-boot:run
```

En otra terminal, dentro de frontend:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir http://127.0.0.1:5173. El proxy `/api` apunta a http://127.0.0.1:8080. Ambos servicios locales escuchan en 127.0.0.1; no hay credenciales en el navegador ni variables de entorno necesarias para el perfil local. Detener cada servicio con Ctrl+C en su terminal. En macOS/Linux, usar `npm` y `./mvnw`.

Si el backend está apagado, aparece el estado de conexión con opción de reintento; la navegación sigue disponible. Para revisar módulos, usar el menú lateral o el menú móvil y volver al inicio. Los textos de fase distinguen claramente lo previsto de lo implementado.

## Comprobar y compilar

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd run test:e2e
```

Las comprobaciones de navegador usan Google Chrome instalado y requieren el backend disponible en 8080; Playwright inicia Vite si no está iniciado. Verifican conexión real, rutas, vistas iniciales, ausencia de desbordamiento en seis tamaños, reglas de accesibilidad con axe, menú/teclado, carga, fallo de conexión y recuperación. Los fallos controlados de conexión usan interceptación HTTP; el estado recuperado consulta la API real. Capturas y trazas se generan en `test-results`, fuera de Git.

Para reproducir capturas sin perder las existentes, copiarlas antes de una nueva ejecución: Playwright limpia sus resultados. Las capturas de cierre se conservan en `docs/verification`.

`npm.cmd run preview` permite revisar los archivos compilados en 4173, pero no es un servidor de despliegue ni configura proxy API. Para comprobar la conexión durante desarrollo, utilizar `run dev`. En la entrega final, el servidor web servirá la aplicación y reenviará `/api` al backend; también resolverá rutas SPA. No se ha realizado un despliegue externo en esta fase.

## Estructura y guías

- `src/app`: composición, navegación, layout y tokens Tailwind.
- `src/features`: modelos, servicios, hooks y componentes por función.
- `src/shared`: componentes y transporte HTTP comunes.
- `tests`: verificaciones de navegador de la base.

Leer [arquitectura visual](docs/architecture.md), AGENTS.md de este repositorio y las guías maestras de la raíz. El backend conserva instantáneas versionadas en `docs/project`. Mantener el prompt maestro, alcance, plan y memoria alineados con cada cambio.

Todos los listados futuros solicitan paginación, filtros y búsqueda al backend, con respuestas acotadas a la página actual. No se filtran colecciones completas en React. Mantener diseño profesional, componentes reutilizables, buena experiencia de usuario y funcionalidad en computadora, tablet y celular.
