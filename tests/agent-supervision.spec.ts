import { createHmac, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

for (const width of [1440, 768, 390]) {
  test(`supervision controls, inbox filters and keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    const payload = JSON.stringify({
      phone_number_id: '123456789012345',
      message: {
        id: 'wamid.' + randomUUID(),
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        from: '51999998888',
        text: { body: 'Soy Paciente Demo. Quiero consultar mi cita.' },
        kapso: { direction: 'inbound', status: 'delivered' },
      },
      conversation: {
        phone_number_id: '123456789012345',
        phone_number: '+51999998888',
        contact_name: 'Familia Demo',
      },
    })
    const response = await page.request.post('/api/v1/integrations/kapso/events', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': createHmac('sha256', 'kapso-webhook-unit-secret-32-characters')
          .update(payload)
          .digest('hex'),
        'X-Webhook-Event': 'whatsapp.message.received',
        'X-Webhook-Payload-Version': 'v2',
        'X-Idempotency-Key': randomUUID(),
      },
    })
    expect(response.status(), await response.text()).toBe(200)
    await page.goto('/conversaciones')
    await page.getByRole('button', { name: 'Ver conversación' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Conversación de WhatsApp' })
    await expect(dialog.getByRole('heading', { name: 'Control y solicitud' })).toBeVisible()
    const giveBack = dialog.getByRole('button', { name: 'Devolver al agente' })
    if (await giveBack.count()) {
      await giveBack.click()
      await expect(dialog.getByText('Agente activo', { exact: true })).toBeVisible()
    }
    await dialog
      .getByLabel('Motivo de atención o cierre')
      .fill('Solicitud de ayuda para cambiar una cita')
    await dialog.getByRole('button', { name: 'Asumir conversación' }).click()
    await expect(dialog.getByText('Atención humana', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Responsable: Administradora de pruebas')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Devolver al agente' })).toBeVisible()
    expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual(
      [],
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mkdir('docs/verification/phase7', { recursive: true })
    await page.screenshot({ path: `docs/verification/phase7/control-${width}.png`, fullPage: true })
    await dialog.getByRole('button', { name: 'Cerrar conversación', exact: true }).click()
    await expect(dialog.getByText('Cerrada', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Devolver al agente' }).click()
    await expect(dialog.getByText('Agente activo', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Ver conversación' }).first()).toBeFocused()
    await page.getByRole('combobox', { name: 'Control', exact: true }).selectOption('AUTO')
    await expect(page.locator('p:visible').filter({ hasText: /^Familia Demo$/ })).toBeVisible()
    await page.getByRole('combobox', { name: 'Control', exact: true }).selectOption('HUMAN')
    await expect(page.getByText('Sin registros para mostrar')).toBeVisible()
  })
  test(`editable agent policy and log at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    await page.goto('/conversaciones')
    await page.getByRole('button', { name: 'Reglas del agente' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reglas y mensajes del agente' })
    await dialog.getByRole('button', { name: 'Añadir jornada' }).click()
    await dialog.getByRole('combobox', { name: 'Día 1', exact: true }).selectOption('2')
    await dialog.getByLabel('Inicio 1', { exact: true }).fill('08:30')
    await dialog.getByLabel('Fin 1', { exact: true }).fill('18:00')
    await dialog.getByLabel('Anticipación mínima para cambios (minutos)').fill('60')
    await dialog
      .getByLabel('Derivación a recepción', { exact: true })
      .fill('Recepción revisará tu solicitud. El asistente queda pausado.')
    expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual(
      [],
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/phase7/policy-${width}.png`, fullPage: true })
    await dialog.getByRole('button', { name: 'Guardar reglas del agente' }).click()
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: 'Reglas del agente' }).click()
    await expect(dialog.getByLabel('Inicio 1', { exact: true })).toHaveValue('08:30')
    await expect(dialog.getByLabel('Anticipación mínima para cambios (minutos)')).toHaveValue('60')
    await dialog.getByRole('button', { name: 'Quitar jornada 1' }).click()
    await dialog.getByLabel('Anticipación mínima para cambios (minutos)').fill('0')
    await dialog.getByRole('button', { name: 'Guardar reglas del agente' }).click()
    await page.getByRole('button', { name: 'Ver conversación' }).first().click()
    const conversation = page.getByRole('dialog', { name: 'Conversación de WhatsApp' })
    await expect(
      conversation.getByRole('heading', { name: 'Seguimiento del agente' }),
    ).toBeVisible()
  })
}
