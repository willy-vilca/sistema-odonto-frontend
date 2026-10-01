# Desarrollo del frontend

Antes de implementar, leer `../AGENTS.md`, `../docs` y el prompt maestro de la raíz. El backend conserva instantáneas versionadas en `../backend/docs/project`.

React + Vite + TypeScript + TailwindCSS. Organizar composición y rutas en app, funciones en features, componentes y servicios comunes en shared. Separar estado, HTTP y presentación. Reutilizar tokens y componentes existentes antes de agregar otros.

Diseño elegante y profesional, pensado para computadora y funcional en tablet y celular desde cada fase. Verificar teclado, foco, controles táctiles, contraste, carga, vacío, error y ausencia de desbordamiento global. Todos los listados solicitan páginas, filtros y búsqueda al backend: React nunca descarga la colección completa para hacerlo localmente. No mostrar datos ficticios como información real.
