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
async function debt(page: Page, id: string) {
  return (
    (await (await page.request.get('/api/v1/charges/summary?patientId=' + id)).json())[0]
      ?.netDebt ?? 0
  )
}
async function pick(page: Page, label: string, name: string) {
  await page.getByRole('button', { name: 'Seleccionar ' + label, exact: true }).click()
  await page.getByLabel('Buscar opciones').fill(name)
  await page.getByRole('button', { name, exact: true }).click()
}
test('presupuesto desde interfaz, propuesta sin deuda y aceptación explícita', async ({ page }) => {
  const data = await seed(page)
  await page.goto('/tratamientos?patientId=' + data.patient.id)
  await page.getByRole('button', { name: 'Nuevo presupuesto', exact: true }).click()
  await page.getByLabel('Título del presupuesto').fill('Presupuesto demostrado')
  await pick(page, 'profesional del plan', data.doctor.fullName)
  await page.getByLabel('Condiciones acordadas').fill('Tres sesiones por importe acordado.')
  await page.getByLabel('Descripción del concepto 1').fill('Tratamiento integral')
  await page.getByLabel('Precio unitario 1').fill('1200')
  await page.getByLabel('Sesiones previstas 1').fill('3')
  await page.getByRole('button', { name: 'Guardar presupuesto' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await debt(page, data.patient.id)).toBe(0)
  await page.getByRole('button', { name: 'Ver plan' }).filter({ visible: true }).click()
  await page.getByRole('button', { name: 'Presentar presupuesto', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Motivo de la operación' })
    .fill('Oferta entregada al paciente')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Presentar presupuesto', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await debt(page, data.patient.id)).toBe(0)
  await page.getByRole('button', { name: 'Ver plan' }).filter({ visible: true }).click()
  await page.getByRole('button', { name: 'Aceptar plan', exact: true }).click()
  await page.getByLabel('Nombre de quien acepta').fill(data.patient.fullName)
  await page.getByLabel('Confirmo la aceptación explícita').check()
  await page
    .getByRole('textbox', { name: 'Motivo de la operación' })
    .fill('Aceptación del paciente')
  await page.getByRole('dialog').getByRole('button', { name: 'Aceptar plan', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await debt(page, data.patient.id)).toBe(1200)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
test('sesión clínica incluida muestra avance y conserva la deuda', async ({ page }) => {
  const data = await seed(page),
    p = await plan(page, data)
  await page.goto('/clinica?patientId=' + data.patient.id)
  await pick(page, 'odontólogo responsable', data.doctor.fullName)
  await page.getByRole('button', { name: 'Nueva atención', exact: true }).click()
  await page.getByRole('textbox', { name: 'Motivo de consulta' }).fill('Sesión del tratamiento')
  await page
    .getByRole('textbox', { name: 'Evolución', exact: true })
    .fill('Sesión completada correctamente')
  await page
    .getByRole('textbox', { name: 'Diagnósticos', exact: true })
    .fill('Diagnóstico registrado')
  await page.getByRole('button', { name: 'Añadir procedimiento' }).click()
  const items = await (await page.request.get('/api/v1/plans/items?planId=' + p.id)).json()
  await pick(page, 'concepto de plan 1 (opcional)', items.items[0].label)
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Ver atención', exact: true })
    .filter({ visible: true })
    .click()
  await page.getByRole('button', { name: 'Finalizar atención', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await debt(page, data.patient.id)).toBe(1200)
  await page.goto('/tratamientos?patientId=' + data.patient.id)
  await page.getByRole('button', { name: 'Ver plan' }).filter({ visible: true }).click()
  await expect(page.getByText('Avance: 1 de 3 sesiones')).toBeVisible()
  await page.getByRole('tab', { name: 'Sesiones realizadas' }).click()
  await expect(
    page.getByText('Tratamiento integral', { exact: true }).filter({ visible: true }),
  ).toBeVisible()
})
test('adicional, ajuste y cancelación conservan movimientos', async ({ page }) => {
  const data = await seed(page),
    p = await plan(page, data)
  await page.goto('/tratamientos?patientId=' + data.patient.id)
  await page.getByRole('button', { name: 'Ver plan' }).filter({ visible: true }).click()
  await page.getByRole('button', { name: 'Añadir adicional' }).click()
  await page.getByLabel('Descripción del concepto 1').fill('Procedimiento adicional')
  await page.getByLabel('Precio unitario 1').fill('200')
  await page
    .getByRole('textbox', { name: 'Motivo del adicional' })
    .fill('Adicional expresamente autorizado')
  await page.getByRole('button', { name: 'Guardar adicional y cargo' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await debt(page, data.patient.id)).toBe(1400)
  await page.goto('/finanzas?patientId=' + data.patient.id)
  await page
    .getByRole('button', { name: 'Ajustar cargo' })
    .filter({ visible: true })
    .first()
    .click()
  await page.getByLabel('Variación del importe').fill('-50')
  await page.getByRole('textbox', { name: 'Motivo del ajuste' }).fill('Reducción autorizada')
  await page.getByRole('button', { name: 'Registrar ajuste' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await debt(page, data.patient.id)).toBe(1350)
  await page.goto('/tratamientos?patientId=' + data.patient.id)
  await page.getByRole('button', { name: 'Ver plan' }).filter({ visible: true }).click()
  await page.getByRole('button', { name: 'Cancelar plan', exact: true }).click()
  await page.getByLabel('Liberar el importe de sesiones pendientes').check()
  await page
    .getByRole('textbox', { name: 'Motivo de la operación' })
    .fill('Cancelación antes de iniciar')
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar plan', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await debt(page, data.patient.id)).toBe(0)
  const movements = await (
    await page.request.get('/api/v1/charges?patientId=' + data.patient.id)
  ).json()
  expect(movements.totalElements).toBe(5)
  expect(p.status).toBe('ACCEPTED')
})
for (const width of [1440, 768, 390])
  test('planes y deuda responsivos en ' + width + ' px', async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const data = await seed(page)
    await plan(page, data)
    await page.goto('/tratamientos?patientId=' + data.patient.id)
    await expect(
      page.getByRole('button', { name: 'Ver plan' }).filter({ visible: true }),
    ).toBeVisible()
    await mkdir('docs/verification/phase4', { recursive: true })
    await page.screenshot({
      path: 'docs/verification/phase4/planes-' + width + '.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Ver plan' }).filter({ visible: true }).tap()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.screenshot({ path: 'docs/verification/phase4/detalle-' + width + '.png' })
    await page.getByRole('button', { name: 'Cerrar formulario' }).click()
    await page.getByRole('button', { name: 'Nuevo presupuesto' }).click()
    await page.getByLabel('Título del presupuesto').focus()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Seleccionar profesional del plan' }),
    ).toBeFocused()
    await page.screenshot({ path: 'docs/verification/phase4/formulario-' + width + '.png' })
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: 'Cerrar formulario' }).click()
    await page.goto('/finanzas?patientId=' + data.patient.id)
    await expect(page.getByText('Deuda generada · PEN')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Ajustar cargo' }).filter({ visible: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy()
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
    await page.screenshot({
      path: 'docs/verification/phase4/deuda-' + width + '.png',
      fullPage: true,
    })
  })
test('caja consulta deuda sin aceptar planes ni ajustar cargos', async ({ page }) => {
  const data = await seed(page)
  await plan(page, data)
  const user = await mutate(page, '/api/v1/users', {
    username: 'cash' + data.suffix,
    displayName: 'Caja',
    email: '',
    password: data.account.password,
    active: true,
    roles: ['CASHIER'],
  })
  await mutate(page, '/api/v1/auth/logout', {})
  const csrf = await (await page.request.get('/api/v1/auth/csrf')).json()
  await page.request.post('/api/v1/auth/login', {
    form: { username: user.username, password: data.account.password },
    headers: { [csrf.headerName]: csrf.token },
  })
  await page.goto('/finanzas?patientId=' + data.patient.id)
  await expect(page.getByRole('button', { name: 'Ajustar cargo' })).toHaveCount(0)
  await expect(page.getByText('Deuda generada · PEN')).toBeVisible()
  const charge = (
    await (await page.request.get('/api/v1/charges?patientId=' + data.patient.id)).json()
  ).items[0]
  const fresh = await (await page.request.get('/api/v1/auth/csrf')).json()
  expect(
    (
      await page.request.post('/api/v1/charges/' + charge.id + '/adjustments', {
        headers: { [fresh.headerName]: fresh.token },
        data: { requestKey: randomUUID(), amount: '-10', reason: 'No permitido' },
      })
    ).status(),
  ).toBe(403)
  await page.goto('/tratamientos?patientId=' + data.patient.id)
  await expect(page.getByRole('button', { name: 'Nuevo presupuesto' })).toHaveCount(0)
})
