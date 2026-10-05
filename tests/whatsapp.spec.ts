import { createHmac, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

const publicBase = 'https://wa.example.test'
const testToken = 'whatsapp-test-token'
const phone = '+51999998888'

async function signedInbound(page: Page, body: string, media = false) {
  const path = '/api/v1/integrations/whatsapp/inbound'
  const fields: Record<string, string> = {
    AccountSid: 'AC' + '1'.repeat(32),
    MessageSid: 'SM' + randomUUID().replaceAll('-', ''),
    From: 'whatsapp:' + phone,
    To: 'whatsapp:+14155238886',
    ProfileName: 'Participante de pruebas',
    Body: body,
    NumMedia: media ? '1' : '0',
    ...(media
      ? { MediaContentType0: 'image/png', MediaUrl0: 'https://example.invalid/test.png' }
      : {}),
  }
  const payload =
    publicBase +
    path +
    Object.keys(fields)
      .sort()
      .map((key) => key + fields[key])
      .join('')
  const signature = createHmac('sha1', testToken).update(payload).digest('base64')
  const response = await page.request.post(path, {
    form: fields,
    headers: { 'X-Twilio-Signature': signature },
  })
  expect(response.ok(), await response.text()).toBe(true)
  return fields.MessageSid
}

async function mutate(page: Page, path: string, body: unknown) {
  const csrf = await (await page.request.get('/api/v1/auth/csrf')).json()
  const response = await page.request.post(path, {
    data: body,
    headers: { [csrf.headerName]: csrf.token },
  })
  expect(response.ok(), await response.text()).toBe(true)
  return response.json()
}

async function checkAccessAndOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
}

for (const width of [1440, 768, 390]) {
  test(`WhatsApp connector shows paged messages and queues a reply at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(180000)
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const suffix = randomUUID().slice(0, 8)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const messagePrefix = 'Prueba de conexión ' + suffix
    const transportText = 'Precio 10%_especial mañana ñ 😀'
    const transportMessage = `${messagePrefix} mensaje 21: ${transportText}`
    let reference = ''
    for (let i = 1; i <= 21; i++)
      reference = await signedInbound(
        page,
        i === 21
          ? transportMessage
          : `${messagePrefix} mensaje ${String(i).padStart(2, '0')}: ¿tienen una cita para mañana?`,
      )
    await signedInbound(page, 'Adjunto de prueba ' + suffix, true)

    await page.goto('/conversaciones')
    await expect(page.getByRole('heading', { name: 'Conversaciones', exact: true })).toBeVisible()
    await expect(
      page.getByText('Configuración lista para la prueba', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Primer paso:', { exact: false })).toContainText(
      'se incorporarán después',
    )
    await page.getByLabel('Buscar', { exact: true }).fill(phone)
    const opener = page.getByRole('button', { name: 'Ver conversación', exact: true })
    await expect(opener).toBeVisible()
    await checkAccessAndOverflow(page)
    await mkdir('docs/verification/whatsapp', { recursive: true })
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement)?.blur()
      window.scrollTo(0, 0)
    })
    await page.screenshot({ path: `docs/verification/whatsapp/inbox-${width}.png`, fullPage: true })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Conversación de WhatsApp', exact: true })
    await expect(dialog).toContainText(phone)
    await dialog.getByLabel('Buscar', { exact: true }).fill(messagePrefix)
    await dialog.getByLabel('Dirección del mensaje').selectOption('INBOUND')
    await expect(dialog.locator('footer').getByRole('status')).toContainText('21 registros')
    await expect(dialog).toContainText(messagePrefix + ' mensaje 21')
    await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(dialog.locator('footer').getByRole('status')).toContainText('Página 2 de 2')
    await dialog.getByLabel('Buscar', { exact: true }).fill(transportMessage)
    await expect(dialog.locator('footer').getByRole('status')).toContainText('1 registros')
    const visibleMessages = dialog.locator('article:visible')
    await expect(visibleMessages.getByText(transportMessage, { exact: true })).toBeVisible()
    await visibleMessages.getByText('Referencia de Twilio', { exact: true }).click()
    await expect(visibleMessages.getByText(reference, { exact: true })).toBeVisible()
    await dialog.getByLabel('Estado del mensaje').selectOption('UNSUPPORTED')
    await expect(dialog).toContainText('Sin registros para mostrar')
    await dialog.getByLabel('Buscar', { exact: true }).fill('Adjunto de prueba ' + suffix)
    await expect(dialog.locator('footer').getByRole('status')).toContainText('1 registros')
    await expect(dialog).toContainText('Formato no admitido')
    await dialog.getByLabel('Buscar', { exact: true }).fill('')
    await dialog.getByLabel('Estado del mensaje').selectOption('')
    await dialog.getByLabel('Dirección del mensaje').selectOption('OUTBOUND')

    const requestKeys: string[] = []
    await page.route('**/api/v1/whatsapp/conversations/*/test-reply', async (route) => {
      requestKeys.push((route.request().postDataJSON() as { requestKey: string }).requestKey)
      if (requestKeys.length === 1)
        await route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          body: JSON.stringify({ detail: 'Fallo temporal de prueba. Intenta nuevamente.' }),
        })
      else await route.continue()
    })
    const reply = dialog.getByRole('button', { name: 'Enviar plantilla de prueba', exact: true })
    await reply.click()
    await expect(dialog.getByRole('alert')).toContainText('Fallo temporal de prueba')
    await reply.click()
    await expect(visibleMessages.getByText('En cola', { exact: true }).first()).toBeVisible()
    expect(requestKeys).toHaveLength(2)
    expect(requestKeys[0]).toBe(requestKeys[1])
    await dialog.getByRole('button', { name: 'Actualizar mensajes', exact: true }).click()
    await expect(visibleMessages.getByText('En cola', { exact: true }).first()).toBeVisible()
    await checkAccessAndOverflow(page)
    await page.screenshot({
      path: `docs/verification/whatsapp/conversation-${width}.png`,
      fullPage: false,
    })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(opener).toBeFocused()
    expect(errors).toEqual([])
  })
}

test('a cashier cannot access WhatsApp conversations or their API', async ({ page, browser }) => {
  const username = 'wa-caja-' + randomUUID().slice(0, 8)
  const password = 'Prueba-' + randomUUID()
  await mutate(page, '/api/v1/users', {
    username,
    displayName: 'Caja sin acceso a WhatsApp',
    password,
    email: '',
    roles: ['CASHIER'],
    active: true,
  })
  const context = await browser.newContext()
  try {
    const restricted = await context.newPage()
    const csrf = await (
      await restricted.request.get('http://127.0.0.1:5174/api/v1/auth/csrf')
    ).json()
    const response = await restricted.request.post('http://127.0.0.1:5174/api/v1/auth/login', {
      form: { username, password },
      headers: { [csrf.headerName]: csrf.token },
    })
    expect(response.status()).toBe(200)
    await restricted.goto('http://127.0.0.1:5174/conversaciones')
    await expect(restricted.getByRole('alert')).toContainText('No tienes permiso para consultar')
    await expect(restricted.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveCount(0)
    expect(
      (await restricted.request.get('http://127.0.0.1:5174/api/v1/whatsapp/connection')).status(),
    ).toBe(403)
  } finally {
    await context.close()
  }
})
