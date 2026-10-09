# WhatsApp: atención y supervisión

09/10/2026. Interfaz vigente, alcance 1.10 y plan 3.12. [Uso, implementación y resultados](../../../../docs/mejoras-interfaz-whatsapp.md).

36 escenarios distintos de navegador aprobados en bloques: 29 de agente, navegación, agenda y atención humana, tres de chat manual y cuatro de compatibilidad/permisos. Computadora, tablet y celular, teclado, foco de diálogos, notificaciones, carga por cursor, filtros del servidor, borradores y estados de entrega. Datos del entorno protegido de pruebas; credenciales ficticias y trabajadores externos detenidos. Las capturas no representan intercambios nuevos con WhatsApp real.

Las imágenes `attention-1440.png`, `attention-768.png` y `attention-390.png` muestran el chat habitual con atención humana. `chat-*` comprueba el historial y los estados de entrega; `policy-*`, los ajustes. Los directorios `agent` y `autonomous-agent` muestran las vistas secundarias del simulador/bitácora. `twilio-*` conserva evidencia de compatibilidad con el proveedor anterior. `control-*` son capturas completas complementarias de los controles. Se inspeccionaron visualmente los tamaños principales.

Reproducir: iniciar backend test con `application-test.properties` y `kapso-agent-e2e.properties`, preparar únicamente sistema_odontologo_test con `scripts/prepare-e2e.ps1` y ejecutar los escenarios agent-supervision, autonomous-agent, agent, foundation, phase2 y whatsapp-workspace. Para kapso.spec utilizar kapso-e2e.properties; para whatsapp.spec, whatsapp-e2e.properties. Preparar de nuevo la base entre configuraciones; no ejecutar Maven verify simultáneamente porque usa la misma base de pruebas. Las claves reales no se usan.

Los errores iniciales y sus correcciones están documentados en la guía; se aprobaron los escenarios repetidos. Axe no detectó infracciones de las reglas A/AA revisadas, sin constituir una certificación del producto completo.
