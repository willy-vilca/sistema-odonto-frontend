import { createHmac, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

for (const width of [1440, 768, 390]) {
  test(`autonomous agent trace, delivery and response-only retry at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
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
    const phone = '+51999998888',
      number = '123456789012345'
    const incoming = 'wamid.' + randomUUID().replaceAll('-', '') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ=='
    const payload = JSON.stringify({
      phone_number_id: number,
      message: {
        id: incoming,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        from: phone.slice(1),
        text: { body: 'Quiero reservar una limpieza dental.' },
        kapso: { direction: 'inbound', status: 'delivered' },
      },
      conversation: {
        phone_number_id: number,
        phone_number: phone,
        contact_name: 'Paciente prueba visual',
      },
    })
    const received = await page.request.post('/api/v1/integrations/kapso/events', {
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
    expect(received.status(), await received.text()).toBe(200)
    const run = execFileSync(
      psql,
      [
        '-h',
        'localhost',
        '-U',
        'postgres',
        '-d',
        'sistema_odontologo_test',
        '-Atc',
        `SELECT r.id FROM agent_run r JOIN kapso_message m ON m.id=r.message_id WHERE m.provider_sid='${incoming}'`,
      ],
      pg,
    ).trim()
    expect(run).toMatch(/^[0-9a-f-]{36}$/)
    const visualReply = 'Claro. Para quien es la cita y que dia prefieres? Prueba ' + width
    const reply = randomUUID(),
      sid = 'wamid.' + randomUUID().replaceAll('-', '') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ=='
    const sql = `INSERT INTO kapso_message(id,conversation_id,direction,kind,body,provider_sid,request_key,status,created_at,updated_at,next_attempt_at,attempts,source) SELECT '${reply}',conversation_id,'OUTBOUND','TEXT','${visualReply}','${sid}','${randomUUID()}','READ',now(),now(),now(),1,'AGENT' FROM agent_run WHERE id='${run}'; UPDATE agent_run SET state='COMPLETED',response_text='${visualReply}',reply_message_id='${reply}',attempts=1 WHERE id='${run}'; INSERT INTO agent_step(id,run_id,ordinal,kind,name,arguments_json,result_json,state,created_at) VALUES('${randomUUID()}','${run}',1,'TOOL','guardar_respuesta','{}','{"automatic":true}','OK',now());`
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
    await page.goto('/conversaciones')
    await expect(page.getByText('Configuración del agente lista', { exact: true })).toHaveCount(0)
    await page.getByLabel('Buscar', { exact: true }).fill(phone)
    await expect(page.getByRole('button', { name: 'Ver conversación', exact: true })).toHaveCount(1)
    await page.getByRole('button', { name: 'Ver conversación', exact: true }).click()
    const conversation = page.getByRole('dialog', { name: 'Conversación de WhatsApp', exact: true })
    await expect(conversation.getByLabel('Mensaje de respuesta')).toBeDisabled()
    await expect(conversation.getByText(visualReply, { exact: true })).toBeVisible()
    await conversation.getByRole('button', { name: 'Historial del asistente' }).click()
    const card = page
      .getByRole('dialog', { name: 'Historial del asistente' })
      .locator('section[aria-label="Seguimiento del agente"]')
    await card.getByLabel('Buscar', { exact: true }).fill(visualReply)
    await expect(card.getByRole('button', { name: 'Ver bitácora', exact: true })).toHaveCount(1)
    await card.getByRole('button', { name: 'Ver bitácora', exact: true }).click()
    const trace = page.getByRole('dialog', { name: 'Bitácora del agente IA', exact: true })
    await expect(
      trace.getByRole('heading', { name: 'Respuesta del agente', exact: true }),
    ).toBeVisible()
    await expect(trace.getByText('Leído', { exact: true })).toBeVisible()
    await expect(
      trace.getByText('Respuesta preparada · sin envío a WhatsApp', { exact: true }),
    ).toHaveCount(0)
    await mkdir('docs/verification/whatsapp-ui/autonomous-agent', { recursive: true })
    await page.screenshot({
      path: `docs/verification/whatsapp-ui/autonomous-agent/trace-${width}.png`,
    })
    // Controlled delivery fixture only; no external provider or model is called.
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
        `UPDATE kapso_message SET status='FAILED',provider_sid=NULL,error_code='AUTH',error_message='Rechazo controlado de prueba' WHERE id='${reply}'`,
      ],
      pg,
    )
    await trace.getByRole('button', { name: 'Actualizar ejecución', exact: true }).click()
    await trace.getByRole('button', { name: 'Reintentar envío de respuesta', exact: true }).click()
    await expect(trace.getByText('Pendiente de envío', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.keyboard.press('Escape')
    await expect(trace).not.toBeVisible()
    await expect(card.getByRole('button', { name: 'Ver bitácora', exact: true })).toBeFocused()
  })
}
