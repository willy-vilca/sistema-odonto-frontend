import { createHmac, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

const phone = '+51999998888',
  number = '123456789012345',
  secret = 'kapso-webhook-unit-secret-32-characters'
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
function fixture(sql: string) {
  const psql = 'C:/Program Files/PostgreSQL/18/bin/psql.exe',
    pg = { env: { ...process.env, PGPASSWORD: 'admin' }, encoding: 'utf8' as const }
  expect(
    execFileSync(
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
    ).trim(),
  ).toBe('sistema_odontologo_test')
  execFileSync(
    psql,
    [
      '-h',
      'localhost',
      '-U',
      'postgres',
      '-d',
      'sistema_odontologo_test',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    pg,
  )
}

for (const width of [1440, 768, 390]) {
  test(`chat cursors, live scroll, server filters and stable manual retry at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const errors: string[] = [],
      agentRequests: string[] = [],
      timelineQueries: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (r) => {
      if (r.url().includes('/agent/')) agentRequests.push(r.url())
      if (r.url().includes('/timeline?')) timelineQueries.push(r.url())
    })
    const prefix = 'Chat ' + randomUUID().slice(0, 8)
    for (let i = 0; i < 36; i++)
      await signedMessage(page, `${prefix} ${i}: mañana ñ 😀 10%_especial`)
    await page.goto('/conversaciones')
    await expect(page.getByText('Kapso Sandbox para WhatsApp', { exact: true })).toHaveCount(0)
    await expect(page.getByText(/fase [0-9]|primera entrega|Sistema conectado/i)).toHaveCount(0)
    await page.getByLabel('Buscar', { exact: true }).fill(phone)
    const opener = page.getByRole('button', { name: 'Ver conversación', exact: true })
    await expect(opener).toHaveCount(1)
    await opener.click()
    const chat = page.getByRole('dialog', { name: 'Conversación de WhatsApp', exact: true })
    const viewport = chat.locator('[data-chat-scroll]')
    await expect(chat.locator('article[data-message-id]')).toHaveCount(30)
    await expect(
      chat.getByText(`${prefix} 35: mañana ñ 😀 10%_especial`, { exact: true }),
    ).toBeVisible()
    await expect(
      chat.getByRole('button', { name: 'Historial del asistente', exact: true }),
    ).toHaveCount(0)
    await chat.getByRole('button', { name: 'Buscar mensajes', exact: true }).click()
    const filtered = page.waitForResponse((r) => {
      const url = new URL(r.url())
      return (
        url.pathname.endsWith('/timeline') &&
        url.searchParams.get('search') === prefix &&
        url.searchParams.get('messageDirection') === 'INBOUND' &&
        !url.searchParams.has('before')
      )
    })
    await chat.getByRole('textbox', { name: 'Buscar mensajes', exact: true }).fill(prefix)
    await chat.getByLabel('Dirección del mensaje').selectOption('INBOUND')
    await filtered
    await expect(chat.locator('article[data-message-id]')).toHaveCount(30)
    await expect(chat.locator('article[data-message-id]').first()).toContainText(`${prefix} 6:`)
    await viewport.evaluate((node) => {
      node.scrollTop = 0
    })
    await expect(chat.locator('article[data-message-id]')).toHaveCount(36)
    expect(await viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(100)
    await chat
      .getByRole('textbox', { name: 'Buscar mensajes', exact: true })
      .fill(`${prefix} 35: mañana ñ 😀 10%_especial`)
    await expect(chat.locator('article[data-message-id]')).toHaveCount(1)
    await chat.getByLabel('Estado del mensaje').selectOption('READ')
    await expect(chat.getByText('No hay mensajes para mostrar.', { exact: true })).toBeVisible()
    await chat.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click()
    await expect(chat.locator('article[data-message-id]')).toHaveCount(30)
    await viewport.evaluate((node) => {
      node.scrollTop = 0
    })
    await expect(chat.locator('article[data-message-id]')).not.toHaveCount(30)
    await viewport.evaluate((node) => {
      node.scrollTop = 250
    })
    const anchor = await viewport.evaluate((node) => node.scrollTop)
    await signedMessage(page, prefix + ' mensaje nuevo mientras leo el historial')
    await expect(chat.getByRole('button', { name: 'Nuevos mensajes', exact: true })).toBeVisible({
      timeout: 12000,
    })
    expect(Math.abs((await viewport.evaluate((node) => node.scrollTop)) - anchor)).toBeLessThan(4)
    await chat.getByRole('button', { name: 'Nuevos mensajes', exact: true }).click()
    await expect(
      chat.getByText(prefix + ' mensaje nuevo mientras leo el historial', { exact: true }),
    ).toBeVisible()
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
    await chat.getByLabel('Mensaje de respuesta').fill(reply)
    const send = chat.getByRole('button', { name: 'Enviar mensaje', exact: true })
    await send.click()
    await expect(chat.getByRole('alert')).toContainText('Fallo temporal de prueba')
    await expect(chat.getByLabel('Mensaje de respuesta')).toHaveValue(reply)
    const saved = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/messages') && r.status() === 200,
    )
    await send.click()
    const outgoing = (await (await saved).json()) as { id: string }
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    const bubble = chat.locator(`[data-message-id="${outgoing.id}"]`)
    await expect(bubble).toHaveAttribute('data-direction', 'OUTBOUND')
    await expect(bubble.getByLabel('Pendiente de envío', { exact: true })).toBeVisible()
    await expect(chat.getByLabel('Mensaje de respuesta')).toHaveValue('')
    expect(outgoing.id).toMatch(/^[0-9a-f-]{36}$/)
    await bubble.getByRole('button', { name: /Información del mensaje/ }).click()
    const information = page.getByRole('dialog', { name: 'Información del mensaje', exact: true })
    await expect(information.getByText('Pendiente de envío', { exact: true })).toBeVisible()
    const sid = reference()
    fixture(`UPDATE kapso_message SET provider_sid='${sid}',attempts=1 WHERE id='${outgoing.id}'`)
    await signedMessage(page, reply, 'read', sid)
    await expect(information.getByText('Leído', { exact: true })).toBeVisible({ timeout: 12000 })
    await expect(
      information
        .locator('dt')
        .filter({ hasText: 'Intentos de envío' })
        .locator('..')
        .getByText('1', { exact: true }),
    ).toBeVisible()
    await information.getByText('Referencia del mensaje', { exact: true }).click()
    await expect(information.getByText(sid, { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await chat.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await mkdir('docs/verification/whatsapp-ui', { recursive: true })
    await page.screenshot({ path: `docs/verification/whatsapp-ui/chat-${width}.png` })
    await page.keyboard.press('Escape')
    await expect(chat).not.toBeVisible()
    await expect(opener).toBeFocused()
    expect(agentRequests).toEqual([])
    expect(errors).toEqual([])
    expect(timelineQueries.some((url) => new URL(url).searchParams.has('before'))).toBe(true)
    expect(timelineQueries.some((url) => new URL(url).searchParams.has('after'))).toBe(true)
    expect(
      timelineQueries.every((url) => Number(new URL(url).searchParams.get('size')) <= 50),
    ).toBe(true)
  })
}
