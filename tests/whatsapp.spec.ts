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
  test(`preserved Twilio connector uses the cursor chat at ${width}px`, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const suffix = randomUUID().slice(0, 8),
      prefix = 'Conector ' + suffix
    const body = `${prefix}: Precio 10%_especial mañana ñ 😀`
    const sid = await signedInbound(page, body)
    await signedInbound(page, 'Adjunto ' + suffix, true)
    await page.goto('/conversaciones')
    await expect(page.getByText('Twilio Sandbox para WhatsApp')).toHaveCount(0)
    await page.getByLabel('Buscar', { exact: true }).fill(phone)
    const opener = page.getByRole('button', { name: 'Ver conversación', exact: true })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Conversación de WhatsApp', exact: true })
    await dialog.getByRole('button', { name: 'Buscar mensajes', exact: true }).click()
    await dialog.getByRole('textbox', { name: 'Buscar mensajes', exact: true }).fill(body)
    await expect(dialog.locator('article[data-message-id]')).toHaveCount(1)
    await expect(dialog.getByText(body, { exact: true })).toBeVisible()
    await dialog
      .locator('article[data-message-id]')
      .getByRole('button', { name: /Información del mensaje/ })
      .click()
    const information = page.getByRole('dialog', { name: 'Información del mensaje', exact: true })
    await information.getByText('Referencia del mensaje').click()
    await expect(information.getByText(sid, { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await dialog
      .getByRole('textbox', { name: 'Buscar mensajes', exact: true })
      .fill('Adjunto ' + suffix)
    await dialog.getByLabel('Estado del mensaje').selectOption('UNSUPPORTED')
    await expect(dialog.locator('article[data-message-id]')).toHaveCount(1)
    await expect(
      dialog.locator('article[data-message-id]').getByText('Formato no admitido', { exact: true }),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click()
    const keys: string[] = []
    await page.route('**/api/v1/whatsapp/conversations/*/test-reply', async (route) => {
      keys.push((route.request().postDataJSON() as { requestKey: string }).requestKey)
      if (keys.length === 1)
        await route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          body: JSON.stringify({ detail: 'Fallo temporal de prueba.' }),
        })
      else await route.continue()
    })
    const reply = dialog.getByRole('button', { name: 'Enviar plantilla', exact: true })
    await reply.click()
    await expect(dialog.getByRole('alert')).toContainText('Fallo temporal de prueba')
    await reply.click()
    await expect(
      dialog.getByRole('img', { name: 'Pendiente de envío', exact: true }).last(),
    ).toBeVisible()
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    await checkAccessAndOverflow(page)
    await mkdir('docs/verification/whatsapp-ui', { recursive: true })
    await page.screenshot({ path: `docs/verification/whatsapp-ui/twilio-${width}.png` })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(opener).toBeFocused()
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
    expect(
      (
        await restricted.request.get(
          'http://127.0.0.1:5174/api/v1/whatsapp/conversations/' + randomUUID() + '/timeline',
        )
      ).status(),
    ).toBe(403)
  } finally {
    await context.close()
  }
})
