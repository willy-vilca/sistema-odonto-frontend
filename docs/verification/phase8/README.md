# Panel y reportes

10/10/2026. Alcance 1.11, plan 3.13. [Cierre, reglas y guía de revisión](../../../../docs/cierre-fase-8.md).

Ocho escenarios nuevos y 68 de regresión aprobados en bloques. Las capturas dashboard-* y report-* muestran computadora, tablet y celular con datos controlados reales del servidor de pruebas: plan aceptado, sesión incluida, servicio individual, abonos, egreso y cuota vencida. No se consultó el Sandbox ni el modelo. CSV/PDF y constancias descargados; identidad del paciente y permisos de recepción comprobados. Axe no detectó infracciones A/AA revisadas.

Reproducción: backend en perfil test, application-test.properties y kapso-agent-e2e.properties; preparar exclusivamente sistema_odontologo_test con scripts/prepare-e2e.ps1 y ejecutar tests/phase8.spec.ts. La preparación valida el nombre de la base. Las modificaciones SQL del conjunto ficticio se envían por entrada UTF-8, evitando la codificación de argumentos de Windows. Trabajadores externos detenidos y claves ficticias. No ejecutar simultáneamente Maven verify y las pruebas de navegador: utilizan la misma base de pruebas.
