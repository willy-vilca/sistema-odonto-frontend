import { test, expect } from './fixtures'
import { seedPhase8, mutate, type Phase8Data } from './phase8-seed'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
let data: Phase8Data
test.describe.configure({ mode: 'serial' })
test('prepare a coherent account and five PDF samples', async ({ page }) => {
  test.setTimeout(120000)
  const settings = await (await page.request.get('/api/v1/settings')).json()
  await mutate(
    page,
    '/api/v1/settings',
    {
      ...settings,
      displayName: 'Clínica Sonrisa Integral',
      legalName: 'Consultorio odontológico',
      address: 'Av. Los Jardines 245, Lima',
      phone: '+51900000000',
      email: 'recepcion@example.test',
      documentHeader: 'Atención odontológica integral',
      documentFooter: 'Conserve este documento para el seguimiento de su atención.',
    },
    'PUT',
  )
  const csrf = await (await page.request.get('/api/v1/auth/csrf')).json()
  const upload = await page.request.post('/api/v1/settings/logo', {
    headers: { [csrf.headerName]: csrf.token },
    multipart: {
      version: String(settings.version + 1),
      file: {
        name: 'logo-demo.png',
        mimeType: 'image/png',
        buffer: await readFile('../docs/datos-prueba/logo-demo.png'),
      },
    },
  })
  expect(upload.ok(), await upload.text()).toBe(true)
  data = await seedPhase8(page)
  await mkdir('.runtime/pdf-presentation', { recursive: true })
  const movements = (
    await (
      await page.request.get(
        '/api/v1/finance/movements?patientId=' + data.patient.id + '&sort=createdAt&direction=asc',
      )
    ).json()
  ).items
  const first = movements.find((m: { kind: string }) => m.kind === 'PAYMENT')
  const charges = (
    await (
      await page.request.get('/api/v1/finance/charges?patientId=' + data.patient.id + '&size=50')
    ).json()
  ).items
  const planCharge = charges.find((c: { debt: number }) => Number(c.debt) === 1200)
  const serviceCharge = charges.find((c: { debt: number }) => Number(c.debt) === 200)
  const cash = await mutate(page, '/api/v1/finance/cash', {
    requestKey: randomUUID(),
    currency: 'PEN',
    opening: 100,
    reason: 'Fondo de caja para atención',
  })
  await mutate(page, '/api/v1/finance/payments', {
    requestKey: randomUUID(),
    patientId: data.patient.id,
    currency: 'PEN',
    amount: 200,
    occurredOn: data.today,
    method: 'CASH',
    reference: 'Cobro de limpieza dental',
    description: 'Pago completo de limpieza dental',
    allocations: [{ chargeId: serviceCharge.id, amount: 200 }],
  })
  const categories = (
    await (await page.request.get('/api/v1/finance/expense-categories?active=true')).json()
  ).items
  await mutate(page, '/api/v1/finance/expenses', {
    requestKey: randomUUID(),
    categoryId: categories[0].id,
    currency: 'PEN',
    amount: 30,
    occurredOn: data.today,
    method: 'CASH',
    reference: 'Egreso de materiales',
    description: 'Compra de materiales de atención',
    supplier: 'Proveedor de demostración',
  })
  const refund = await mutate(page, '/api/v1/finance/payments/' + first.id + '/refund', {
    requestKey: randomUUID(),
    amount: 50,
    occurredOn: data.today,
    reason: 'Devolución parcial acordada con el paciente',
    releases: [{ chargeId: planCharge.id, amount: 50 }],
  })
  const statement = await mutate(page, '/api/v1/finance/documents/statement', {
    requestKey: randomUUID(),
    patientId: data.patient.id,
    currency: 'PEN',
  })
  await mutate(page, '/api/v1/finance/cash/' + cash.id + '/close', {
    requestKey: randomUUID(),
    counted: 270,
    reason: 'Cierre con recuento conforme',
  })
  const receipt = await (
    await page.request.get('/api/v1/finance/documents/receipt/' + first.id)
  ).json()
  const refundReceipt = await (
    await page.request.get('/api/v1/finance/documents/receipt/' + refund.id)
  ).json()
  for (const [name, url] of [
    ['constancia-abono', '/api/v1/finance/documents/' + receipt.id + '/content'],
    ['constancia-devolucion', '/api/v1/finance/documents/' + refundReceipt.id + '/content'],
    ['estado-de-cuenta', '/api/v1/finance/documents/' + statement.id + '/content'],
    ['arqueo-caja', '/api/v1/finance/cash/' + cash.id + '/report'],
    [
      'reporte-tratamientos',
      '/api/v1/reports/TREATMENTS/export?format=PDF&patientId=' + data.patient.id,
    ],
  ]) {
    const response = await page.request.get(url)
    expect(response.ok(), await response.text()).toBe(true)
    const bytes = await response.body()
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF')
    await writeFile('.runtime/pdf-presentation/' + name + '.pdf', bytes)
  }
  // The clinical template API remains available even though it has no frontend controls.
  const template = await mutate(page, '/api/v1/clinical/templates', {
    name: 'Plantilla conservada en el servidor',
    kind: 'ENCOUNTER',
    content: 'Contenido de prueba',
    active: true,
    version: 0,
  })
  expect(template.id).toBeTruthy()
})
for (const width of [1440, 768, 390]) {
  test(`mandatory markers and clinical drafts without templates at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(60000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    await page.goto('/configuracion/consultorio')
    await expect(page.getByRole('link', { name: /plantillas/i })).toHaveCount(0)
    await page.goto('/clinica?patientId=' + data.patient.id)
    await page
      .getByRole('button', { name: 'Seleccionar odontólogo responsable', exact: true })
      .click()
    await page.getByLabel('Buscar opciones').fill(data.doctor.fullName)
    await page.getByRole('button', { name: data.doctor.fullName, exact: true }).click()
    await page.getByRole('button', { name: 'Nueva atención', exact: true }).click()
    const form = page.getByRole('dialog', { name: 'Nueva atención', exact: true })
    await expect(form.getByRole('button', { name: /plantilla/i })).toHaveCount(0)
    for (const name of ['Evolución', 'Diagnósticos']) {
      const input = form.getByLabel(name, { exact: true })
      expect(await input.evaluate((e) => (e as HTMLTextAreaElement).required)).toBe(false)
      await expect(input.locator('..').locator('[aria-hidden="true"]')).toHaveText('*')
    }
    for (const name of ['Anamnesis', 'Indicaciones'])
      await expect(
        form.getByLabel(name, { exact: true }).locator('..').locator('[aria-hidden="true"]'),
      ).toHaveCount(0)
    const reason = form.getByLabel('Motivo de consulta', { exact: true })
    expect(await reason.evaluate((e) => (e as HTMLTextAreaElement).required)).toBe(true)
    await expect(reason.locator('..').locator('[aria-hidden="true"]')).toHaveText('*')
    await reason.fill('Borrador con campos pendientes ' + width)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mkdir('docs/verification/presentation', { recursive: true })
    await page.screenshot({
      path: `docs/verification/presentation/encounter-required-${width}.png`,
    })
    const saved = page.waitForResponse(
      (r) => r.url().endsWith('/clinical/encounters') && r.request().method() === 'POST',
    )
    await form.getByRole('button', { name: 'Guardar borrador' }).click()
    const record = await (await saved).json()
    expect(record.status).toBe('DRAFT')
    expect(record.content.evolution).toBe('')
    expect(record.content.diagnoses).toBe('')
    await expect(form).not.toBeVisible()
  })
}
