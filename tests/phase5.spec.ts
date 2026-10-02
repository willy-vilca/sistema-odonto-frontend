import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
test.use({ hasTouch: true })
async function mutate(page: Page, url: string, body: unknown, method = 'POST') {
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  const result = await page.request.fetch(url, {
    method,
    data: body,
    headers: { [token.headerName]: token.token },
  })
  expect(result.ok(), await result.text()).toBeTruthy()
  const text = await result.text()
  return text ? JSON.parse(text) : {}
}
async function seed(page: Page) {
  const suffix = randomUUID().slice(0, 8),
    account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8'))
  const user = await mutate(page, '/api/v1/users', {
    username: 'plan' + suffix,
    displayName: 'Dra. Elena ' + suffix,
    email: '',
    password: account.password,
    active: true,
    roles: ['DENTIST'],
  })
  const doctor = await mutate(page, '/api/v1/dentists', {
    userId: user.id,
    fullName: 'Dra. Elena ' + suffix,
    licenseNumber: 'TR' + suffix,
    specialty: 'Odontología general',
    active: true,
    serviceIds: [],
  })
  const patient = await mutate(page, '/api/v1/patients', {
    fullName: 'Paciente tratamiento ' + suffix,
    birthDate: '1990-01-01',
    documentType: '',
    documentNumber: '',
    address: '',
    email: '',
    emergencyName: '',
    emergencyPhone: '',
    notes: '',
    provisional: false,
    active: true,
    contacts: [
      {
        phone: '+51988776655',
        name: 'Contacto',
        relationship: 'Paciente',
        guardian: false,
        payer: true,
      },
    ],
  })
  return { suffix, doctor, patient, account }
}
async function plan(page: Page, data: Awaited<ReturnType<typeof seed>>, accept = true) {
  let record = await mutate(page, '/api/v1/plans', {
    patientId: data.patient.id,
    dentistId: data.doctor.id,
    title: 'Plan integral ' + data.suffix,
    conditions: 'Tres sesiones acordadas; sin intereses.',
    items: [
      {
        description: 'Tratamiento integral',
        quantity: 1,
        sessions: 3,
        unitPrice: '1200.00',
        tooth: 11,
      },
    ],
    version: 0,
    requestKey: randomUUID(),
  })
  if (accept)
    for (const action of ['propose', 'accept'])
      record = await mutate(page, '/api/v1/plans/' + record.id + '/actions/' + action, {
        version: record.version,
        requestKey: randomUUID(),
        reason: 'Acuerdo expreso del paciente',
        acceptedBy: 'Responsable del paciente',
        releaseUnperformed: false,
      })
  return record
}
async function pick(page: Page, label: string, name: string) {
  await page.getByRole('button', { name: 'Seleccionar ' + label, exact: true }).click()
  await page.getByLabel('Buscar opciones').fill(name)
  await page.getByRole('button', { name, exact: true }).click()
}

async function chargeId(page: Page, id: string) {
  return (await (await page.request.get('/api/v1/charges?patientId=' + id)).json()).items[0].id
}
async function summary(page: Page, id: string) {
  return (await (await page.request.get('/api/v1/finance/summary?patientId=' + id)).json())[0]
}
async function pay(page: Page, patientId: string, charge: string, amount: string, apply = true) {
  return mutate(page, '/api/v1/finance/payments', {
    requestKey: randomUUID(),
    patientId,
    currency: 'PEN',
    amount,
    occurredOn: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
    method: 'TRANSFER',
    reference: 'Referencia de prueba',
    description: 'Abono del paciente',
    allocations: apply ? [{ chargeId: charge, amount }] : [],
  })
}
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  test('cobro y cuenta en ' + viewport.width + 'px', async ({ page }) => {
    await page.setViewportSize(viewport)
    const data = await seed(page)
    await plan(page, data)
    const charge = await chargeId(page, data.patient.id)
    await page.goto('/finanzas?patientId=' + data.patient.id)
    await expect(page.getByRole('heading', { name: 'Cobros y cuentas claras' })).toBeVisible()
    await page.getByRole('button', { name: 'Registrar abono', exact: true }).tap()
    await page.getByLabel('Importe del abono', { exact: true }).fill('300')
    await page.getByLabel('Importe del abono', { exact: true }).press('Tab')
    await expect(page.getByLabel('Fecha del abono', { exact: true })).toBeFocused()
    await page
      .getByRole('combobox', { name: 'Medio de pago', exact: true })
      .selectOption('TRANSFER')
    await pick(page, 'cargos', 'Tratamiento integral')
    await page.getByLabel('Importe aplicado 1', { exact: true }).fill('300')
    await mkdir('docs/verification/phase5', { recursive: true })
    await page.screenshot({
      path: 'docs/verification/phase5/' + viewport.width + '-cobro.png',
      fullPage: true,
    })
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: 'Guardar abono', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await pay(page, data.patient.id, charge, '200')
    await page.reload()
    expect((await summary(page, data.patient.id)).pending).toBe(700)
    await page.screenshot({
      path: 'docs/verification/phase5/' + viewport.width + '-cuenta.png',
      fullPage: true,
    })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy()
    await page.getByRole('button', { name: 'Pagos', exact: true }).tap()
    await expect(
      page.getByText('Referencia de prueba', { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible()
    await page.screenshot({
      path: 'docs/verification/phase5/' + viewport.width + '-pagos.png',
      fullPage: true,
    })
    const download = page.waitForEvent('download')
    await page
      .getByRole('button', { name: 'Constancia PDF' })
      .filter({ visible: true })
      .first()
      .click()
    expect((await download).suggestedFilename()).toMatch(/.pdf$/)
    await page
      .getByRole('button', { name: 'Ver movimiento' })
      .filter({ visible: true })
      .first()
      .click()
    await page
      .getByRole('button', { name: 'Visualizar', exact: true })
      .filter({ visible: true })
      .first()
      .click()
    await expect(page.getByRole('img', { name: /Constancia interna/ })).toBeVisible()
    await page.getByRole('button', { name: 'Ampliar', exact: true }).tap()
    await expect(page.getByText('Zoom 150%', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Reducir', exact: true }).tap()
    await page.screenshot({
      path: 'docs/verification/phase5/' + viewport.width + '-constancia.png',
      fullPage: true,
    })
  })
}
for (const width of [1440, 768, 390]) {
  test('anticipo, cuotas y corrección en ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const data = await seed(page)
    await plan(page, data)
    const charge = await chargeId(page, data.patient.id)
    await pay(page, data.patient.id, charge, '300', false)
    await page.goto('/finanzas?patientId=' + data.patient.id)
    await page.getByRole('button', { name: 'Pagos', exact: true }).click()
    await page
      .getByRole('button', { name: 'Aplicar anticipo', exact: true })
      .filter({ visible: true })
      .click()
    await pick(page, 'cargos', 'Tratamiento integral')
    await page.getByLabel('Importe aplicado 1').fill('300')
    await page
      .getByRole('textbox', { name: 'Motivo de la operación', exact: true })
      .fill('Aplicación del anticipo verificado')
    await page.getByRole('button', { name: 'Confirmar operación', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect((await summary(page, data.patient.id)).advance).toBe(0)
    await page.getByRole('button', { name: 'Cargos', exact: true }).click()
    await page
      .getByRole('button', { name: 'Programar cuotas', exact: true })
      .filter({ visible: true })
      .click()
    await page.getByLabel('Importe cuota 1', { exact: true }).fill('600')
    await page.getByRole('button', { name: 'Añadir cuota', exact: true }).click()
    await page.getByLabel('Importe cuota 2', { exact: true }).fill('600')
    await page
      .getByRole('textbox', { name: 'Motivo de la operación', exact: true })
      .fill('Dos cuotas acordadas')
    await page.getByRole('button', { name: 'Confirmar calendario' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Cuotas', exact: true }).click()
    await expect(page.getByText('Cuota 1', { exact: true }).filter({ visible: true })).toBeVisible()
    expect((await summary(page, data.patient.id)).debt).toBe(1200)
    await page.screenshot({
      path: 'docs/verification/phase5/' + width + '-cuotas.png',
      fullPage: true,
    })
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: 'Pagos', exact: true }).click()
    await page
      .getByRole('button', { name: 'Ver movimiento', exact: true })
      .filter({ visible: true })
      .click()
    await page.getByRole('button', { name: 'Revertir pago', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Motivo de la operación', exact: true })
      .fill('Corrección aprobada')
    await page.getByRole('button', { name: 'Confirmar operación', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect((await summary(page, data.patient.id)).pending).toBe(1200)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Estado de cuenta PDF' }).click()
    expect((await download).suggestedFilename()).toMatch(/.pdf$/)
  })
}
for (const width of [1440, 768, 390]) {
  test('egreso con sustento y cierre de caja en ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const data = await seed(page)
    await plan(page, data)
    const charge = await chargeId(page, data.patient.id)
    const payment = await pay(page, data.patient.id, charge, '200')
    const doc = await (
      await page.request.get('/api/v1/finance/documents/receipt/' + payment.id)
    ).json()
    const pdf = await (
      await page.request.get('/api/v1/finance/documents/' + doc.id + '/content')
    ).body()
    await page.goto('/finanzas')
    await page.getByRole('button', { name: 'Caja', exact: true }).click()
    await page.getByRole('button', { name: 'Abrir caja', exact: true }).click()
    await page.getByLabel('Fondo inicial de efectivo').fill('100')
    await page
      .getByRole('textbox', { name: 'Motivo y observaciones de caja', exact: true })
      .fill('Fondo inicial de prueba')
    await page.getByRole('button', { name: 'Confirmar apertura' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Categorías', exact: true }).click()
    await page.getByRole('button', { name: 'Añadir categoría', exact: false }).click()
    await page.getByLabel('Nombre de la categoría').fill('Insumos ' + data.suffix)
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Egresos', exact: true }).click()
    await page.getByRole('button', { name: 'Registrar egreso', exact: true }).click()
    await pick(page, 'categoría del egreso', 'Insumos ' + data.suffix)
    await page.getByLabel('Importe del egreso').fill('30')
    await page
      .getByRole('textbox', { name: 'Concepto del egreso', exact: true })
      .fill('Materiales para el consultorio')
    await page.getByLabel('Proveedor (opcional)').fill('Proveedor de prueba')
    await page.screenshot({
      path: 'docs/verification/phase5/' + width + '-egreso.png',
      fullPage: true,
    })
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: 'Guardar egreso' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Ver movimiento' })
      .filter({ visible: true })
      .first()
      .click()
    await page.getByRole('button', { name: 'Adjuntar sustento' }).click()
    await page.getByLabel('Descripción del sustento').fill('Comprobante del proveedor')
    await page
      .getByLabel('Imagen o PDF')
      .setInputFiles({ name: 'sustento.pdf', mimeType: 'application/pdf', buffer: pdf })
    await page.getByRole('button', { name: 'Guardar sustento' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.getByRole('button', { name: 'Cerrar formulario' }).click()
    await page.getByRole('button', { name: 'Caja', exact: true }).click()
    await page.getByRole('button', { name: 'Cerrar caja', exact: true }).click()
    await page.getByLabel('Efectivo contado').fill('68')
    await page
      .getByRole('textbox', { name: 'Motivo y observaciones de caja', exact: true })
      .fill('Diferencia documentada de dos soles')
    await page.getByRole('button', { name: 'Confirmar cierre' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const list = await (
      await page.request.get('/api/v1/finance/cash?closed=true&sort=createdAt&direction=desc')
    ).json()
    expect(list.items[0].expected).toBe(70)
    expect(list.items[0].difference).toBe(-2)
    await page.screenshot({
      path: 'docs/verification/phase5/' + width + '-caja.png',
      fullPage: true,
    })
    const download = page.waitForEvent('download')
    await page
      .getByRole('button', { name: 'Arqueo PDF', exact: true })
      .filter({ visible: true })
      .first()
      .click()
    expect((await download).suggestedFilename()).toMatch(/pdf$/)
  })
}
test('caja consulta y cobra con permisos limitados', async ({ page }) => {
  const data = await seed(page)
  await plan(page, data)
  await mutate(page, '/api/v1/users', {
    username: 'cash' + data.suffix,
    displayName: 'Caja ' + data.suffix,
    email: '',
    password: data.account.password,
    active: true,
    roles: ['CASHIER'],
  })
  await mutate(page, '/api/v1/auth/logout', {})
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  expect(
    (
      await page.request.post('/api/v1/auth/login', {
        form: { username: 'cash' + data.suffix, password: data.account.password },
        headers: { [token.headerName]: token.token },
      })
    ).ok(),
  ).toBeTruthy()
  await page.goto('/finanzas?patientId=' + data.patient.id)
  await expect(page.getByRole('button', { name: 'Registrar abono', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ajustar cargo', exact: true })).toHaveCount(0)
  const response = await page.request.get('/api/v1/documents?patientId=' + data.patient.id)
  expect(response.status()).toBe(403)
  await page.getByRole('button', { name: 'Categorías', exact: true }).click()
  await expect(page.getByRole('button', { name: /Añadir categoría/ })).toHaveCount(0)
})

test('descuento y anulación desde cargos conservan el historial', async ({ page }) => {
  const data = await seed(page)
  await plan(page, data)
  await page.goto('/finanzas?patientId=' + data.patient.id)
  await page
    .getByRole('button', { name: 'Descuento', exact: true })
    .filter({ visible: true })
    .click()
  await page.getByLabel('Importe del descuento').fill('100')
  await page
    .getByRole('textbox', { name: 'Motivo de la operación', exact: true })
    .fill('Descuento aprobado por administración')
  await page.getByRole('button', { name: 'Confirmar operación', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await summary(page, data.patient.id)).debt).toBe(1100)
  await page
    .getByRole('button', { name: 'Anular cargo', exact: true })
    .filter({ visible: true })
    .click()
  await page
    .getByRole('textbox', { name: 'Motivo de la operación', exact: true })
    .fill('Anulación administrativa documentada')
  await page.getByRole('button', { name: 'Confirmar operación', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await summary(page, data.patient.id)).debt).toBe(0)
  const charges = await (
    await page.request.get('/api/v1/charges?patientId=' + data.patient.id)
  ).json()
  expect(charges.totalElements).toBe(3)
})
