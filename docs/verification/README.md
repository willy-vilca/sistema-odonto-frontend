# Verificación de la fase 0

Fecha: 30/09/2026. Base visual comprobada con conexión real frontend/backend/PostgreSQL.

8 pruebas de navegador aprobadas. Tamaños: 1440×900, 1280×800, 1024×768, 768×1024, 390×844 y 360×800. Se verificaron navegación, foco, carga, fallo controlado/reintento, menú móvil, Escape y ausencia de desbordamientos. Axe no detectó infracciones de las reglas A/AA comprobadas en inicio, vista de módulo y menú móvil. Se inspeccionaron las capturas; esta comprobación no certifica el producto completo.

- inicio-1440.png: computadora con navegación lateral.
- inicio-768.png: tablet con contenido adaptado.
- inicio-390.png: celular con tarjetas apiladas.

Las capturas corresponden a la fase 0 y presentan únicamente información real de la instalación y módulos futuros identificados. No hay pacientes ni métricas de demostración fingidas. El ciclo de foco del menú móvil fue corregido y comprobado antes del cierre.

Reproducir con backend disponible y `npm.cmd run test:e2e`. Las nuevas capturas se generan en test-results, fuera de Git; copiar a esta carpeta solo las capturas aprobadas de cada revisión. El cierre completo y las guías maestras se encuentran en la raíz del proyecto y sus instantáneas en backend/docs/project.
