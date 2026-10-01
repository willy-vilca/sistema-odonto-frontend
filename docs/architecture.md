# Arquitectura y sistema visual

React + Vite + TypeScript estricto + TailwindCSS. `app` compone rutas, navegación y layout; `features` agrupa responsabilidades de cada función; `shared` contiene componentes y HTTP comunes. No mezclar consultas y presentación ni centralizar el sistema en App.tsx.

El módulo installation define el contrato de datos, el servicio HTTP, el hook de estado y la tarjeta visual por separado. Hay cancelación al desmontar, tiempo máximo de espera y reintento explícito. La respuesta se comprueba en ejecución; no se asume que un tipo TypeScript valide una respuesta remota.

Paleta clínica clara: marca verde, fondos neutros, bordes suaves y texto con contraste. Tokens en `src/app/styles.css`, componentes en `shared/ui`. DM Sans para lectura y Manrope para títulos, servidas localmente. Lucide mantiene iconos consistentes; la marca provisional OdontoCare podrá sustituirse por la identidad del consultorio en fase 1.

Computadora: navegación lateral. Tablet/celular: menú modal con ciclo de foco, Escape y retorno al botón. Se proporciona salto al contenido, foco tras navegación y soporte para reducción de movimiento. Todos los flujos futuros deberán funcionar en los tres formatos; no basta con ocultar columnas o acciones.

La fase 0 presenta vistas informativas de módulos futuros, identificadas por su fase. No muestra métricas, pacientes o citas inventadas como información real. Solo la tarjeta de instalación consulta datos persistidos.

Listados futuros: el servicio solicita página, tamaño, filtros y búsqueda al backend. React representa la página recibida y sus totales; no descarga colecciones para filtrar o paginar en memoria. La agenda consulta rangos acotados; su vista de lista se pagina. Imágenes y PDF se descargan bajo demanda.

No introducir una librería de estado, consultas o UI por anticipación. Elegirla cuando exista una necesidad real y justificarla en estas decisiones. El estado inicial utiliza hooks de React y fetch.
