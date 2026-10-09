import { createHmac, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

for (const width of [1440, 768, 390]) {
  test(`human reply, preserved draft, keyboard and secondary information at ${width}px`, async ({
    page,
  }) => {
    const height = width === 390 ? 844 : 900
    await page.setViewportSize({ width, height })
    const payload = JSON.stringify({
      phone_number_id: '123456789012345',
      message: {
        id: 'wamid.' + randomUUID(),
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        from: '51999998888',
        text: { body: 'Necesito ayuda de recepción, por favor.' },
        kapso: { direction: 'inbound', status: 'delivered' },
      },
      conversation: {
        phone_number_id: '123456789012345',
        phone_number: '+51999998888',
        contact_name: 'Familia Demo',
      },
    })
    const inbound = await page.request.post('/api/v1/integrations/kapso/events', {
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
    expect(inbound.status()).toBe(200)
    await page.goto('/conversaciones')
    await page.getByLabel('Buscar', { exact: true }).fill('+51999998888')
    const opener = page.getByRole('button', { name: 'Ver conversación', exact: true })
    await expect(opener).toHaveCount(1)
    await opener.click()
    const chat = page.getByRole('dialog', { name: 'Conversación de WhatsApp', exact: true })
    const input = chat.getByLabel('Mensaje de respuesta')
    await expect(chat.getByText('Agente activo', { exact: true })).toBeVisible()
    await expect(input).toBeDisabled()
    await expect(chat.getByRole('button', { name: 'Ver bitácora' })).toHaveCount(0)
    const bounds = await chat.boundingBox()
    expect(bounds!.height).toBeLessThanOrEqual(height)
    if (width === 390) expect(bounds!.y).toBeLessThanOrEqual(1)
    await chat.getByRole('button', { name: 'Asumir conversación', exact: true }).click()
    await expect(input).toBeEnabled()
    await input.fill('Hola. Voy a ayudarte a revisar tu cita.')
    await chat.getByRole('button', { name: 'Información de la conversación', exact: true }).click()
    const information = page.getByRole('dialog', {
      name: 'Información de la conversación',
      exact: true,
    })
    await expect(information.getByText('Responsable: Administradora de pruebas')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(input).toHaveValue('Hola. Voy a ayudarte a revisar tu cita.')
    await chat.getByRole('button', { name: 'Devolver al asistente', exact: true }).click()
    await expect(input).toBeDisabled()
    await expect(input).toHaveValue('Hola. Voy a ayudarte a revisar tu cita.')
    await chat.getByRole('button', { name: 'Asumir conversación', exact: true }).click()
    await expect(input).toBeEnabled()
    let posts = 0
    page.on('request', (r) => {
      if (
        r.method() === 'POST' &&
        /\/conversations\/[^/]+\/messages$/.test(new URL(r.url()).pathname)
      )
        posts++
    })
    await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true })
    expect(posts).toBe(0)
    await input.press('Shift+Enter')
    await input.press('Control+End')
    await input.pressSequentially('Recepción del consultorio.')
    expect(posts).toBe(0)
    if (width === 1440) await input.press('Enter')
    else await chat.getByRole('button', { name: 'Enviar mensaje', exact: true }).click()
    await expect(input).toHaveValue('')
    expect(posts).toBe(1)
    const outgoing = chat.locator('article[data-direction="OUTBOUND"]').last()
    await expect(outgoing).toContainText('Recepción del consultorio.')
    await expect(
      outgoing.getByRole('img', { name: 'Pendiente de envío', exact: true }),
    ).toBeVisible()
    const errors = (
      await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    ).violations
    expect(errors).toEqual([])
    while (await chat.getByRole('button', { name: 'Cerrar notificación', exact: true }).count())
      await chat.getByRole('button', { name: 'Cerrar notificación', exact: true }).first().click()
    await input.focus()
    await mkdir('docs/verification/whatsapp-ui', { recursive: true })
    await page.screenshot({ path: `docs/verification/whatsapp-ui/attention-${width}.png` })
    await chat.getByRole('button', { name: 'Devolver al asistente', exact: true }).click()
    await expect(chat.getByText('Agente activo', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  })
}

test('normal pages contain no development or connection notices', async ({ page }) => {
  for (const path of [
    '/',
    '/agenda',
    '/pacientes',
    '/clinica',
    '/tratamientos',
    '/finanzas',
    '/conversaciones',
    '/configuracion/consultorio',
  ]) {
    await page.goto(path)
    await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible()
    await expect(
      page.getByText(
        /fase\s*[0-9]|primera entrega|en desarrollo|Sistema conectado|backend conectado|Conexión de prueba|próximamente/i,
      ),
    ).toHaveCount(0)
  }
  await page.goto('/conversaciones')
  await expect(page.getByText('Kapso Sandbox para WhatsApp', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Información del servicio', exact: true }).click()
  const information = page.getByRole('dialog', { name: 'Información del servicio', exact: true })
  await expect(information.getByText('Kapso Sandbox para WhatsApp', { exact: true })).toBeVisible()
  await expect(
    information.getByRole('button', { name: 'Abrir simulador del asistente', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Información del servicio', exact: true }),
  ).toBeFocused()
})
