import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

test.describe.configure({ mode: 'serial' })
test.use({ hasTouch: true })
let dentist: { id: string; fullName: string },
  service: { id: string; name: string },
  appointmentPatient: { id: string; fullName: string },
  walkIn: { id: string; fullName: string }
const suffix = randomUUID().slice(0, 8)
const phone = '+51976543210'
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}
function later() {
  const date = new Date(today() + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + 2)
  return date.toISOString().slice(0, 10)
}
async function mutate(page: Page, url: string, body: unknown, method = 'POST') {
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  const response = await page.request.fetch(url, {
    method,
    data: body,
    headers: { [token.headerName]: token.token },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  return response.json()
}
async function choose(page: Page, label: string, value: string) {
  await page.getByRole('button', { name: 'Seleccionar ' + label, exact: true }).click()
  const search = page.getByLabel('Buscar opciones').last()
  await search.fill(value)
  await page.getByRole('button', { name: value, exact: true }).click()
}
async function quick(page: Page, name: string) {
  await page.getByRole('button', { name: '+ Registrar paciente', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar paciente', exact: true })
  await dialog.getByLabel('Nombre completo', { exact: true }).fill(name)
  await dialog.getByLabel('Teléfono', { exact: true }).fill('976543210')
  await dialog.getByRole('button', { name: 'Guardar y seleccionar' }).click()
  await expect(dialog).toHaveCount(0)
  const response = await page.request.get('/api/v1/patients?search=' + encodeURIComponent(name))
  return (await response.json()).items[0]
}

test('una sola cuenta configura el profesional; auditoría retirada y opciones adicionales conservadas', async ({
  page,
}) => {
  const account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8'))
  const owner = (await (await page.request.get('/api/v1/users?search=' + account.username)).json())
    .items[0]
  const category = await mutate(page, '/api/v1/categories', {
    name: 'General mini ' + suffix,
    active: true,
    version: 0,
  })
  service = await mutate(page, '/api/v1/services', {
    name: 'Limpieza mini ' + suffix,
    categoryId: category.id,
    price: '200.00',
    durationMinutes: 60,
    description: '',
    bookableByAgent: true,
    active: true,
    version: 0,
  })
  dentist = await mutate(page, '/api/v1/dentists', {
    userId: owner.id,
    fullName: 'Dra. Solo ' + suffix,
    licenseNumber: 'MINI-' + suffix,
    specialty: '',
    active: true,
    serviceIds: [service.id],
    version: 0,
  })
  for (let day = 1; day <= 7; day++)
    await mutate(page, '/api/v1/schedules/periods', {
      dentistId: dentist.id,
      dayOfWeek: day,
      kind: 'WORK',
      startMinute: 480,
      endMinute: 1080,
      active: true,
      version: 0,
    })
  await page.goto('/configuracion')
  await expect(page.getByRole('link', { name: 'Auditoría', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Opciones adicionales', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Roles', exact: true }).click()
  await page.getByRole('button', { name: 'Ocultar opciones adicionales', exact: true }).click()
  await expect(page).toHaveURL(/configuracion\/consultorio$/)
  await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toHaveCount(0)
  await page.goto('/configuracion/auditoria')
  await expect(page.getByRole('alert')).toContainText('Esta sección no está disponible')
})

test('paciente dentro de una cita: dos campos, contacto de pago y ningún envío accidental del formulario padre', async ({
  page,
}) => {
  await page.goto('/agenda')
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click()
  appointmentPatient = await quick(page, 'Paciente Agenda Mini ' + suffix)
  expect(appointmentPatient).toMatchObject({ provisional: true, active: true, birthDate: null })
  const record = await (await page.request.get('/api/v1/patients/' + appointmentPatient.id)).json()
  expect(record.contacts[0]).toMatchObject({
    phone,
    payer: true,
    guardian: false,
    name: appointmentPatient.fullName,
    relationship: 'Paciente',
  })
  expect(
    (
      await (
        await page.request.get('/api/v1/appointments?patientId=' + appointmentPatient.id)
      ).json()
    ).totalElements,
  ).toBe(0)
  await expect(page.getByRole('dialog', { name: 'Nueva cita' })).toContainText(dentist.fullName)
  await expect(
    page.getByRole('button', { name: 'Seleccionar odontólogo', exact: true }),
  ).toHaveCount(0)
  await choose(page, 'servicio', service.name)
  await page.getByLabel('Inicio de la cita', { exact: true }).fill(later() + 'T09:00')
  await page.getByRole('button', { name: 'Reservar cita', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Nueva cita', exact: true })).toHaveCount(0)
  const appointments = (
    await (await page.request.get('/api/v1/appointments?patientId=' + appointmentPatient.id)).json()
  ).items
  expect(appointments).toHaveLength(1)
  expect(appointments[0]).toMatchObject({
    dentistId: dentist.id,
    serviceId: service.id,
    durationMinutes: 60,
  })
})

test('atención sin cita con paciente básico: notas opcionales, precio automático y cobro íntegro', async ({
  page,
}) => {
  await page.goto('/clinica')
  walkIn = await quick(page, 'Paciente Atención Mini ' + suffix)
  await page.getByRole('button', { name: 'Nueva atención', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Nueva atención', exact: true })
  await expect(editor.getByLabel('Anamnesis', { exact: true })).toHaveCount(0)
  await editor.locator('summary').filter({ hasText: 'Notas clínicas' }).click()
  for (const label of ['Evolución', 'Diagnósticos', 'Indicaciones']) {
    await expect(editor.getByLabel(label, { exact: true })).not.toHaveAttribute('required', '')
    await expect(editor.getByLabel(label, { exact: true })).toHaveValue('')
  }
  await editor.getByRole('button', { name: 'Añadir procedimiento', exact: true }).click()
  await choose(page, 'servicio del procedimiento 1 (opcional)', service.name)
  await expect(editor.getByLabel('Precio acordado 1 (opcional)', { exact: true })).toHaveValue(
    '200',
  )
  await editor.getByRole('button', { name: 'Guardar atención', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Detalle de atención', exact: true })
  await expect(detail).toBeVisible()
  await detail.getByRole('button', { name: 'Finalizar y cobrar', exact: true }).click()
  const checkout = page.getByRole('dialog', { name: 'Finalizar y cobrar', exact: true })
  await checkout.getByLabel('Medio de pago', { exact: true }).selectOption('TRANSFER')
  await checkout.getByRole('button', { name: 'Confirmar atención y cobro', exact: true }).click()
  await expect(checkout).toHaveCount(0)
  const encounters = (
    await (await page.request.get('/api/v1/clinical/encounters?patientId=' + walkIn.id)).json()
  ).items
  expect(encounters).toHaveLength(1)
  expect(encounters[0]).toMatchObject({ status: 'FINAL', appointmentId: null })
  const charges = (
    await (
      await page.request.get('/api/v1/finance/charges?patientId=' + walkIn.id + '&closed=true')
    ).json()
  ).items
  expect(charges).toHaveLength(1)
  expect(Number(charges[0].pending)).toBe(0)
  const payments = (
    await (
      await page.request.get('/api/v1/finance/movements?patientId=' + walkIn.id + '&kind=PAYMENT')
    ).json()
  ).items
  expect(payments).toHaveLength(1)
  expect(Number(payments[0].amount)).toBe(200)
})

test('abono parcial con aplicación sugerida y edición manual conservada al cambiar el importe', async ({
  page,
}) => {
  const encounter = await mutate(page, '/api/v1/clinical/encounters', {
    patientId: walkIn.id,
    dentistId: dentist.id,
    attendedOn: today(),
    reason: '',
    version: 0,
    content: {
      anamnesis: '',
      evolution: '',
      diagnoses: '',
      indications: '',
      procedures: [{ serviceId: service.id, description: 'Cargo parcial mini', quantity: 1 }],
    },
  })
  await mutate(page, '/api/v1/clinical/encounters/' + encounter.id + '/finalize', {
    version: encounter.version,
  })
  await page.goto('/finanzas?patientId=' + walkIn.id)
  await page.getByRole('button', { name: 'Registrar abono', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar abono', exact: true })
  await dialog.getByLabel('Importe del abono', { exact: true }).fill('100')
  await dialog.getByLabel('Medio de pago', { exact: true }).selectOption('TRANSFER')
  await choose(page, 'cargos', 'Cargo parcial mini')
  await expect(dialog.getByLabel('Importe aplicado 1', { exact: true })).toHaveValue('100.00')
  await dialog.getByLabel('Importe del abono', { exact: true }).fill('250')
  await expect(dialog.getByLabel('Importe aplicado 1', { exact: true })).toHaveValue('200.00')
  await dialog.getByLabel('Importe aplicado 1', { exact: true }).fill('80')
  await dialog.getByLabel('Importe del abono', { exact: true }).fill('150')
  await expect(dialog.getByLabel('Importe aplicado 1', { exact: true })).toHaveValue('80')
  await dialog.getByRole('button', { name: 'Guardar abono', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const summary = (
    await (await page.request.get('/api/v1/finance/summary?patientId=' + walkIn.id)).json()
  )[0]
  expect(Number(summary.pending)).toBe(120)
  expect(Number(summary.advance)).toBe(70)
})

test('un anticipo se aplica automáticamente hasta el dinero disponible sin registrar otro ingreso', async ({
  page,
}) => {
  await page.goto('/finanzas?patientId=' + walkIn.id)
  await page.getByRole('button', { name: 'Pagos', exact: true }).click()
  await page.getByRole('button', { name: 'Aplicar anticipo', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Aplicar anticipo', exact: true })
  await choose(page, 'cargos', 'Cargo parcial mini')
  await expect(dialog.getByLabel('Importe aplicado 1', { exact: true })).toHaveValue('70.00')
  await dialog
    .getByLabel('Motivo de la operación', { exact: true })
    .fill('Completar aplicación del abono')
  await dialog.getByRole('button', { name: 'Confirmar operación', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const summary = (
    await (await page.request.get('/api/v1/finance/summary?patientId=' + walkIn.id)).json()
  )[0]
  expect(Number(summary.pending)).toBe(50)
  expect(Number(summary.advance)).toBe(0)
  expect(
    (
      await (
        await page.request.get('/api/v1/finance/movements?patientId=' + walkIn.id + '&kind=PAYMENT')
      ).json()
    ).totalElements,
  ).toBe(2)
})

test('varios cargos distribuyen el dinero restante y conservan la edición explícita', async ({
  page,
}) => {
  const patient = await mutate(page, '/api/v1/patients/quick', {
    fullName: 'Distribución Mini ' + suffix,
    phone,
  })
  for (const description of ['Primer cargo mini', 'Segundo cargo mini']) {
    const encounter = await mutate(page, '/api/v1/clinical/encounters', {
      patientId: patient.id,
      dentistId: dentist.id,
      attendedOn: today(),
      reason: '',
      version: 0,
      content: {
        anamnesis: '',
        evolution: '',
        diagnoses: '',
        indications: '',
        procedures: [{ serviceId: service.id, description, quantity: 1 }],
      },
    })
    await mutate(page, '/api/v1/clinical/encounters/' + encounter.id + '/finalize', {
      version: encounter.version,
    })
  }
  await page.goto('/finanzas?patientId=' + patient.id)
  await page.getByRole('button', { name: 'Registrar abono', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar abono', exact: true })
  await dialog.getByLabel('Importe del abono', { exact: true }).fill('300.10')
  await choose(page, 'cargos', 'Primer cargo mini')
  await expect(dialog.getByLabel('Importe aplicado 1', { exact: true })).toHaveValue('200.00')
  // Multi-selection stays open after selecting the first charge.
  await dialog.getByLabel('Buscar opciones').fill('Segundo cargo mini')
  await dialog.getByRole('button', { name: 'Segundo cargo mini', exact: true }).click()
  await expect(dialog.getByLabel('Importe aplicado 2', { exact: true })).toHaveValue('100.10')
  await dialog.getByLabel('Importe aplicado 1', { exact: true }).fill('150.05')
  await expect(dialog.getByLabel('Importe aplicado 2', { exact: true })).toHaveValue('150.05')
  await dialog.getByLabel('Importe del abono', { exact: true }).fill('350.10')
  await expect(dialog.getByLabel('Importe aplicado 1', { exact: true })).toHaveValue('150.05')
  await expect(dialog.getByLabel('Importe aplicado 2', { exact: true })).toHaveValue('200.00')
  await dialog.getByLabel('Medio de pago', { exact: true }).selectOption('TRANSFER')
  await dialog.getByRole('button', { name: 'Guardar abono', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const summary = (
    await (await page.request.get('/api/v1/finance/summary?patientId=' + patient.id)).json()
  )[0]
  expect(Number(summary.pending)).toBe(49.95)
  expect(Number(summary.advance)).toBe(0.05)
})

for (const [width, height] of [
  [1440, 900],
  [768, 1024],
  [390, 844],
]) {
  test(`formularios simples, teclado y presentación accesible en ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/clinica?patientId=' + walkIn.id)
    await page.getByRole('button', { name: 'Nueva atención', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Nueva atención', exact: true })
    await expect(dialog).toBeVisible()
    await dialog.locator('summary').filter({ hasText: 'Notas clínicas' }).click()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflow).toBe(false)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([])
    await mkdir('evidence/mini', { recursive: true })
    await page.screenshot({ path: `evidence/mini/atencion-${width}.png`, fullPage: true })
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Nueva cita', exact: true }).click()
    await page.getByRole('button', { name: '+ Registrar paciente', exact: true }).click()
    await expect(
      page.getByRole('dialog', { name: 'Registrar paciente', exact: true }),
    ).toBeVisible()
    await page.getByLabel('Nombre completo', { exact: true }).fill('Prueba teclado')
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Teléfono', { exact: true })).toBeFocused()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([])
    await page.screenshot({ path: `evidence/mini/paciente-${width}.png`, fullPage: true })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Nueva cita', exact: true })).toBeVisible()
  })
}
