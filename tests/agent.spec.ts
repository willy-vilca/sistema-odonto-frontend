import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

for (const width of [1440, 768, 390]) {
  test(`agent test form, trace and server pagination at ${width}px`, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/conversaciones')
    await page.getByRole('button', { name: 'Información del servicio', exact: true }).click()
    await page.getByRole('button', { name: 'Abrir simulador del asistente', exact: true }).click()
    const testDialog = page.getByRole('dialog', { name: 'Probar agente IA', exact: true })
    const phone = '+519' + String(width).padStart(8, '0')
    await testDialog.getByLabel('Teléfono del contacto').fill(phone)
    await testDialog.getByLabel('Nombre del contacto (opcional)').fill('Contacto prueba IA')
    await testDialog
      .getByLabel('Mensaje para el agente')
      .fill('Soy Paciente Demo. Quiero una limpieza dental mañana a las 9:00 am.')
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await mkdir('docs/verification/whatsapp-ui/agent', { recursive: true })
    await page.screenshot({ path: `docs/verification/whatsapp-ui/agent/form-${width}.png` })
    const queuedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/agent/test-messages') && response.request().method() === 'POST',
    )
    await testDialog.getByRole('button', { name: 'Analizar mensaje', exact: true }).click()
    const queued = (await (await queuedResponse).json()) as {
      conversationId: string
      runId: string
    }
    const conversation = page.getByRole('dialog', { name: 'Conversación de WhatsApp', exact: true })
    await conversation.getByRole('button', { name: 'Historial del asistente' }).click()
    const history = page.getByRole('dialog', { name: 'Historial del asistente' })
    await expect(
      history.getByRole('heading', { name: 'Seguimiento del agente', exact: true }),
    ).toBeVisible()
    // Only UI fixture evidence is seeded. The backend worker is disabled; no model is called.
    const psql = 'C:/Program Files/PostgreSQL/18/bin/psql.exe'
    const pgOptions = { env: { ...process.env, PGPASSWORD: 'admin' }, encoding: 'utf8' as const }
    const database = execFileSync(
      psql,
      [
        '-h',
        'localhost',
        '-U',
        'postgres',
        '-d',
        'sistema_odontologo_test',
        '-Atc',
        'SELECT current_database()',
      ],
      pgOptions,
    ).trim()
    expect(database).toBe('sistema_odontologo_test')
    expect(queued.runId).toMatch(/^[0-9a-f-]{36}$/)
    const steps = Array.from(
      { length: 21 },
      (_, index) =>
        `('${randomUUID()}','${queued.runId}',${index + 1},'TOOL','consultar_servicios','{"search":"limpieza"}'::jsonb,'{"evidence":"Evidencia UI ${index + 1}"}'::jsonb,'OK',now())`,
    ).join(',')
    execFileSync(
      psql,
      [
        '-h',
        'localhost',
        '-U',
        'postgres',
        '-d',
        database,
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        `UPDATE agent_run SET state='COMPLETED',response_text='Respuesta preparada de prueba visual. Sin envio a WhatsApp.',input_tokens=20,output_tokens=10 WHERE id='${queued.runId}'; INSERT INTO agent_step(id,run_id,ordinal,kind,name,arguments_json,result_json,state,created_at) VALUES ${steps}`,
      ],
      pgOptions,
    )
    await history.getByRole('button', { name: 'Actualizar agente', exact: true }).click()
    await expect(
      history.getByText('Completado', { exact: true }).filter({ visible: true }),
    ).toBeVisible()
    await history.getByRole('button', { name: 'Ver bitácora', exact: true }).click()
    const trace = page.getByRole('dialog', { name: 'Bitácora del agente IA', exact: true })
    await expect(trace).toContainText('Prueba desde la aplicación')
    await expect(trace).toContainText('Respuesta preparada · sin envío a WhatsApp')
    await trace.getByLabel('Tipo de acción').selectOption('TOOL')
    await trace.getByLabel('Buscar', { exact: true }).fill('Evidencia UI')
    await expect(trace.locator('footer').getByRole('status')).toContainText('21 registros')
    await trace.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(trace.locator('footer').getByRole('status')).toContainText('Página 2 de 2')
    await trace
      .locator('details:visible')
      .first()
      .getByText('Datos de la acción', { exact: true })
      .click()
    await expect(
      trace.getByText('Evidencia UI 21', { exact: false }).filter({ visible: true }),
    ).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.screenshot({ path: `docs/verification/whatsapp-ui/agent/trace-${width}.png` })
    await page.keyboard.press('Escape')
    await expect(trace).not.toBeVisible()
    await expect(history.getByRole('button', { name: 'Ver bitácora', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(history).not.toBeVisible()
    await page.keyboard.press('Escape')
    await expect(conversation).not.toBeVisible()
    expect(errors).toEqual([])
  })
}
