import { createHmac, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

const phone = '+51999998888'
const number = '123456789012345'
const secret = 'kapso-webhook-unit-secret-32-characters'
function reference() {
  return 'wamid.' + randomUUID().replaceAll('-', '') + 'ABCDEFGHIJ0123456789=='
}
async function signedMessage(page: Page, body: string, state = 'received', id = reference()) {
  const payload = JSON.stringify({
    phone_number_id: number,
    message: {
      id,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: 'text',
      ...(state === 'received' ? { from: phone.slice(1) } : { to: phone.slice(1) }),
      text: { body },
      kapso: { direction: state === 'received' ? 'inbound' : 'outbound', status: state },
    },
    conversation: {
      phone_number_id: number,
      phone_number: phone,
      contact_name: 'Participante Kapso',
    },
  })
  const response = await page.request.post('/api/v1/integrations/kapso/events', {
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': createHmac('sha256', secret).update(payload).digest('hex'),
      'X-Webhook-Event': 'whatsapp.message.' + state,
      'X-Idempotency-Key': randomUUID(),
      'X-Webhook-Payload-Version': 'v2',
    },
  })
  expect(response.status(), await response.text()).toBe(200)
  return id
}

for (const width of [1440, 768, 390]) {
  test(`Kapso manual messages, pagination and stable retry at ${width}px`, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const pageErrors: string[] = [],
      agentRequests: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('request', (request) => {
      if (request.url().includes('/agent/')) agentRequests.push(request.url())
    })
    const prefix = 'Kapso prueba ' + randomUUID().slice(0, 8)
    for (let i = 0; i < 21; i++)
      await signedMessage(page, `${prefix} ${i}: mañana ñ 😀 10%_especial`)
    await page.goto('/conversaciones')
    await expect(page.getByText('Kapso Sandbox para WhatsApp', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Probar agente', exact: true })).toHaveCount(0)
    await expect(page.getByText('Prueba de conexión manual.', { exact: false })).toContainText(
      'desactivados',
    )
    await page.getByLabel('Buscar', { exact: true }).fill(phone)
    const opener = page.getByRole('button', { name: 'Ver conversación', exact: true })
    await expect(opener).toHaveCount(1)
    await mkdir('docs/verification/kapso', { recursive: true })
    await page.screenshot({ path: `docs/verification/kapso/inbox-${width}.png`, fullPage: true })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Conversación de WhatsApp', exact: true })
    await expect(
      dialog.getByRole('heading', { name: 'Seguimiento del agente', exact: true }),
    ).toHaveCount(0)
    await dialog.getByLabel('Buscar', { exact: true }).fill(prefix)
    await dialog.getByLabel('Dirección del mensaje').selectOption('INBOUND')
    await expect(dialog.locator('footer').getByRole('status')).toContainText('21 registros')
    await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(dialog.locator('footer').getByRole('status')).toContainText('Página 2 de 2')
    const needle = `${prefix} 20: mañana ñ 😀 10%_especial`
    await dialog.getByLabel('Buscar', { exact: true }).fill(needle)
    await expect(dialog.locator('footer').getByRole('status')).toContainText('1 registros')
    await expect(dialog.getByText(needle, { exact: true }).filter({ visible: true })).toBeVisible()
    const keys: string[] = []
    await page.route('**/api/v1/whatsapp/conversations/*/messages', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      keys.push((route.request().postDataJSON() as { requestKey: string }).requestKey)
      if (keys.length === 1)
        await route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          body: JSON.stringify({ detail: 'Fallo temporal de prueba. Reintenta.' }),
        })
      else await route.continue()
    })
    const reply = `Respuesta manual ${prefix}: mañana ñ 😀`
    await dialog.getByLabel('Mensaje de respuesta').fill(reply)
    const send = dialog.getByRole('button', { name: 'Enviar mensaje', exact: true })
    await send.click()
    await expect(dialog.getByRole('alert')).toContainText('Fallo temporal de prueba')
    await expect(dialog.getByLabel('Mensaje de respuesta')).toHaveValue(reply)
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/messages') &&
        response.status() === 200,
    )
    await send.click()
    const outgoing = (await (await saved).json()) as { id: string }
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    await dialog.getByLabel('Buscar', { exact: true }).fill(reply)
    await dialog.getByLabel('Dirección del mensaje').selectOption('OUTBOUND')
    await expect(
      dialog.getByText('En cola', { exact: true }).filter({ visible: true }),
    ).toBeVisible()
    // Fixture only: connect the controlled API reference before delivering a signed status event.
    const psql = 'C:/Program Files/PostgreSQL/18/bin/psql.exe'
    const pg = { env: { ...process.env, PGPASSWORD: 'admin' }, encoding: 'utf8' as const }
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
      pg,
    ).trim()
    expect(database).toBe('sistema_odontologo_test')
    expect(outgoing.id).toMatch(/^[0-9a-f-]{36}$/)
    const sid = reference()
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
        `UPDATE kapso_message SET provider_sid='${sid}' WHERE id='${outgoing.id}'`,
      ],
      pg,
    )
    await signedMessage(page, reply, 'read', sid)
    await dialog.getByRole('button', { name: 'Actualizar mensajes', exact: true }).click()
    await expect(dialog.getByText('Leído', { exact: true }).filter({ visible: true })).toBeVisible()
    await dialog.getByText('Referencia de Kapso', { exact: true }).filter({ visible: true }).click()
    await expect(dialog.getByText(sid, { exact: true }).filter({ visible: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.screenshot({ path: `docs/verification/kapso/conversation-${width}.png` })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(opener).toBeFocused()
    expect(agentRequests).toEqual([])
    expect(pageErrors).toEqual([])
  })
}
