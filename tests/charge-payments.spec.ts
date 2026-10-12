import { test, expect } from './fixtures'
import { randomUUID } from 'node:crypto'
import { readFile, mkdir } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mutate } from './phase8-seed'

test.use({ hasTouch: true })
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
async function seed(page: Page, free = false) {
  const suffix = randomUUID().slice(0, 8)
  const account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8'))
  const user = await mutate(page, '/api/v1/users', {
    username: 'cargo' + suffix,
    displayName: 'Odontóloga cargos ' + suffix,
    password: account.password,
    email: '',
    active: true,
    roles: ['DENTIST'],
  })
  const doctor = await mutate(page, '/api/v1/dentists', {
    userId: user.id,
    fullName: user.displayName,
    licenseNumber: 'CAR-' + suffix,
    specialty: '',
    active: true,
    serviceIds: [],
  })
  const patient = await mutate(page, '/api/v1/patients/quick', {
    fullName: 'Paciente cargos ' + suffix,
    phone: '+51976543210',
  })
  const descriptions = ['Tratamiento principal ' + suffix, 'Tratamiento adicional ' + suffix]
  let plan = await mutate(page, '/api/v1/plans', {
    patientId: patient.id,
    dentistId: doctor.id,
    title: 'Plan cargos ' + suffix,
    conditions: '',
    version: 0,
    requestKey: randomUUID(),
    items: descriptions.map((description, i) => ({
      description,
      quantity: 1,
      sessions: 1,
      unitPrice: free && i === 0 ? '0.00' : i === 0 ? '1200.00' : '400.00',
    })),
  })
  for (const action of ['propose', 'accept'])
    plan = await mutate(page, `/api/v1/plans/${plan.id}/actions/${action}`, {
      version: plan.version,
      requestKey: randomUUID(),
      reason: 'Acuerdo de prueba',
      acceptedBy: patient.fullName,
      releaseUnperformed: false,
    })
  const response = await page.request.get('/api/v1/charges?patientId=' + patient.id)
  const rows = (await response.json()).items as { id: string; description: string }[]
  return {
    patient,
    first: rows.find((c) => c.description === descriptions[0])!,
    second: rows.find((c) => c.description === descriptions[1])!,
    suffix,
  }
}
async function pay(
  page: Page,
  data: Awaited<ReturnType<typeof seed>>,
  amount: string,
  allocations: { chargeId: string; amount: string }[],
  description: string,
) {
  return mutate(page, '/api/v1/finance/payments', {
    requestKey: randomUUID(),
    patientId: data.patient.id,
    amount,
    allocations,
    currency: 'PEN',
    occurredOn: today(),
    method: 'TRANSFER',
    reference: 'REF-' + description,
    description,
  })
}
function chargeRow(page: Page, description: string) {
  return (page.viewportSize()!.width >= 768 ? page.getByRole('row') : page.locator('article'))
    .filter({ hasText: description })
    .filter({ visible: true })
}
async function review(page: Page, name: string, width: number) {
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await mkdir('evidence/charge-payments', { recursive: true })
  await page.screenshot({ path: `evidence/charge-payments/${name}-${width}.png`, fullPage: true })
}

for (const width of [1440, 768, 390]) {
  test(`cargo sin pagar, parcial y finalizado con pagos y constancia en ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    const data = await seed(page)
    await page.goto('/finanzas?patientId=' + data.patient.id)
    let row = chargeRow(page, data.first.description)
    await expect(row.getByText('Sin pagar', { exact: true })).toBeVisible()
    await expect(row.getByText('Total del cargo', { exact: true })).toBeVisible()
    await expect(row).toContainText(/1[., ]200[.,]00/)
    const shared = await pay(
      page,
      data,
      '500',
      [
        { chargeId: data.first.id, amount: '300' },
        { chargeId: data.second.id, amount: '200' },
      ],
      'Pago compartido ' + data.suffix,
    )
    await pay(
      page,
      data,
      '200',
      [{ chargeId: data.first.id, amount: '200' }],
      'Segundo abono ' + data.suffix,
    )
    await page.reload()
    row = chargeRow(page, data.first.description)
    await expect(row.getByText('Pago parcial', { exact: true })).toBeVisible()
    await expect(row).toContainText(/500[.,]00/)
    await expect(row).toContainText(/700[.,]00/)
    await review(page, 'parcial', width)
    const loaded = page.waitForRequest(
      (r) =>
        r.url().includes('/finance/movements?') &&
        new URL(r.url()).searchParams.get('chargeId') === data.first.id,
    )
    await row.getByRole('button', { name: 'Ver pagos', exact: true }).tap()
    expect(new URL((await loaded).url()).searchParams.get('size')).toBe('20')
    const payments = page.getByRole('dialog', { name: 'Pagos del cargo', exact: true })
    await expect(payments.getByText('2 registros · Página 1 de 1', { exact: true })).toBeVisible()
    const paymentRow = (width >= 768 ? payments.getByRole('row') : payments.locator('article'))
      .filter({ hasText: shared.description })
      .filter({ visible: true })
    await expect(paymentRow).toContainText(/Aplicado a este cargo:\s*S\/\s*300[.,]00/)
    await paymentRow.getByRole('button', { name: 'Ver movimiento', exact: true }).tap()
    const detail = page.getByRole('dialog', { name: 'Detalle del movimiento', exact: true })
    await expect(detail).toContainText(shared.reference)
    await expect(detail).toContainText(shared.receiptCode)
    await expect(detail).toContainText(/Aplicado a este cargo:\s*S\/\s*300[.,]00/)
    const download = page.waitForEvent('download')
    await detail.getByRole('button', { name: 'Constancia PDF', exact: true }).tap()
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/)
    await review(page, 'detalle', width)
    await page.keyboard.press('Escape')
    await expect(detail).toHaveCount(0)
    await expect(payments).toBeVisible()
    await expect(
      paymentRow.getByRole('button', { name: 'Ver movimiento', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(payments).toHaveCount(0)
    await pay(
      page,
      data,
      '700',
      [{ chargeId: data.first.id, amount: '700' }],
      'Saldo final ' + data.suffix,
    )
    await page.reload()
    await expect(
      chargeRow(page, data.first.description).getByText('Pagado por completo', { exact: true }),
    ).toBeVisible()
    await mutate(page, `/api/v1/finance/charges/${data.first.id}/close`, {
      requestKey: randomUUID(),
      reason: 'Pago completo verificado',
    })
    await page.reload()
    await page.getByLabel('Estado del cargo').selectOption('true')
    row = chargeRow(page, data.first.description)
    await expect(row.getByText('Pagado por completo', { exact: true })).toBeVisible()
    await expect(row).toContainText('Finalizado')
    await row.getByRole('button', { name: 'Ver pagos', exact: true }).tap()
    await expect(payments.getByText('3 registros · Página 1 de 1', { exact: true })).toBeVisible()
    await review(page, 'finalizado', width)
  })
}

test('pagos del cargo conservan búsqueda, filtros y paginación del servidor', async ({ page }) => {
  const data = await seed(page)
  for (let i = 1; i <= 11; i++)
    await pay(
      page,
      data,
      '10',
      [{ chargeId: data.first.id, amount: '10' }],
      `Abono ${String(i).padStart(2, '0')} ${data.suffix}`,
    )
  await pay(
    page,
    data,
    '20',
    [{ chargeId: data.second.id, amount: '20' }],
    'Abono ajeno al cargo ' + data.suffix,
  )
  await page.goto('/finanzas?patientId=' + data.patient.id)
  await chargeRow(page, data.first.description)
    .getByRole('button', { name: 'Ver pagos', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Pagos del cargo', exact: true })
  await expect(dialog.getByText('11 registros · Página 1 de 1', { exact: true })).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Por página', exact: true }).selectOption('10')
  await expect(dialog.getByText('11 registros · Página 1 de 2', { exact: true })).toBeVisible()
  const requested = page.waitForResponse(
    (r) =>
      r.url().includes('/finance/movements?') && new URL(r.url()).searchParams.get('page') === '1',
  )
  await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click()
  const response = await (await requested).json()
  expect(response.items).toHaveLength(1)
  expect(response.size).toBe(10)
  await dialog.getByLabel('Buscar', { exact: true }).fill('Abono 05')
  await expect(dialog.getByText('1 registros · Página 1 de 1', { exact: true })).toBeVisible()
  await expect(
    dialog.getByText('Abono ajeno al cargo ' + data.suffix, { exact: true }),
  ).toHaveCount(0)
  await dialog.getByLabel('Medio').selectOption('CASH')
  await expect(dialog.getByText('Sin registros para mostrar', { exact: true })).toBeVisible()
})

test('sin deuda no se presenta como dinero cobrado y una devolución conserva el pago histórico', async ({
  page,
}) => {
  const data = await seed(page, true)
  const payment = await pay(
    page,
    data,
    '100',
    [{ chargeId: data.second.id, amount: '100' }],
    'Abono devuelto ' + data.suffix,
  )
  await mutate(page, `/api/v1/finance/payments/${payment.id}/refund`, {
    requestKey: randomUUID(),
    amount: '100',
    occurredOn: today(),
    reason: 'Devolución completa de prueba',
    releases: [{ chargeId: data.second.id, amount: '100' }],
  })
  await page.goto('/finanzas?patientId=' + data.patient.id)
  await expect(
    chargeRow(page, data.first.description).getByText('Sin deuda', { exact: true }),
  ).toBeVisible()
  await expect(
    chargeRow(page, data.second.description).getByText('Sin pagar', { exact: true }),
  ).toBeVisible()
  await chargeRow(page, data.second.description)
    .getByRole('button', { name: 'Ver pagos', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Pagos del cargo', exact: true })
  await expect(
    dialog.getByText(payment.description, { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText(/Aplicado a este cargo:\s*S\/\s*0[.,]00/).filter({ visible: true }),
  ).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Ver movimiento', exact: true })
    .filter({ visible: true })
    .click()
  await expect(
    page
      .getByRole('dialog', { name: 'Detalle del movimiento', exact: true })
      .getByRole('button', { name: 'Constancia PDF', exact: true }),
  ).toBeVisible()
})

test('un fallo al cargar pagos puede reintentarse sin perder el cargo ni registrar dinero', async ({
  page,
}) => {
  const data = await seed(page)
  await pay(
    page,
    data,
    '100',
    [{ chargeId: data.first.id, amount: '100' }],
    'Abono conservado ' + data.suffix,
  )
  await page.goto('/finanzas?patientId=' + data.patient.id)
  const match = `**/api/v1/finance/movements?**chargeId=${data.first.id}**`
  await page.route(match, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/problem+json',
      body: JSON.stringify({ status: 503, detail: 'Consulta temporalmente no disponible' }),
    }),
  )
  await chargeRow(page, data.first.description)
    .getByRole('button', { name: 'Ver pagos', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Pagos del cargo', exact: true })
  await expect(dialog.getByRole('alert')).toContainText('Consulta temporalmente no disponible')
  await page.unroute(match)
  await dialog.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expect(dialog.getByText('1 registros · Página 1 de 1', { exact: true })).toBeVisible()
  const charges = (
    await (await page.request.get('/api/v1/charges?patientId=' + data.patient.id)).json()
  ).items
  expect(charges.find((c: { id: string }) => c.id === data.first.id)).toMatchObject({
    applied: 100,
    pending: 1100,
    paymentStatus: 'PARTIAL',
  })
})
