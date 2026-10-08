import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import AxeBuilder from '@axe-core/playwright'
import { readFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
test.use({ timezoneId: 'Asia/Tokyo' })
async function mutate(page: Page, url: string, body: unknown, method = 'POST') {
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  const response = await page.request.fetch(url, {
    method,
    data: body,
    headers: { [token.headerName]: token.token },
  })
  expect(response.ok(), await response.text()).toBe(true)
  return response.status() === 204 ? undefined : await response.json()
}
async function seed(page: Page) {
  const suffix = randomUUID().slice(0, 8)
  const account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8'))
  const settings = await (await page.request.get('/api/v1/settings')).json()
  await mutate(
    page,
    '/api/v1/settings',
    { ...settings, minimumLeadMinutes: 0, appointmentGapMinutes: 0 },
    'PUT',
  )
  const category = await mutate(page, '/api/v1/categories', {
    name: 'Agenda ' + suffix,
    active: true,
  })
  const service = await mutate(page, '/api/v1/services', {
    name: 'Sesión de 60 min ' + suffix,
    categoryId: category.id,
    price: 100,
    durationMinutes: 60,
    description: '',
    bookableByAgent: true,
    active: true,
  })
  const doctors = []
  for (const label of ['Carolina', 'Miguel']) {
    const name = 'Dr. ' + label + ' ' + suffix
    const user = await mutate(page, '/api/v1/users', {
      username: label.toLowerCase() + suffix,
      displayName: name,
      email: '',
      password: account.password,
      active: true,
      roles: ['DENTIST'],
    })
    const doctor = await mutate(page, '/api/v1/dentists', {
      userId: user.id,
      fullName: name,
      licenseNumber: 'COP-' + label + suffix,
      specialty: '',
      active: true,
      serviceIds: [service.id],
    })
    doctors.push(doctor)
    await mutate(page, '/api/v1/schedules/periods', {
      dentistId: doctor.id,
      dayOfWeek: 1,
      kind: 'WORK',
      startMinute: 540,
      endMinute: 1080,
      active: true,
    })
    await mutate(page, '/api/v1/schedules/periods', {
      dentistId: doctor.id,
      dayOfWeek: 1,
      kind: 'BREAK',
      startMinute: 720,
      endMinute: 780,
      active: true,
    })
  }
  const patient = await mutate(
    page,
    '/api/v1/patients',
    patientBody('Adulto ' + suffix, '1990-01-01', '+51988887777', false),
  )
  return { suffix, service, doctors, patient, account }
}
function patientBody(name: string, birth: string | null, phone: string, guardian: boolean) {
  return {
    fullName: name,
    birthDate: birth,
    documentType: '',
    documentNumber: '',
    address: '',
    email: '',
    emergencyName: '',
    emergencyPhone: '',
    notes: '',
    active: true,
    provisional: birth === null,
    contacts: [
      {
        phone,
        name: guardian ? 'Madre de familia' : 'Contacto',
        relationship: guardian ? 'Madre' : 'Paciente',
        guardian,
        payer: true,
      },
    ],
  }
}
async function pick(page: Page, label: string, option: string) {
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Seleccionar ' + label.toLowerCase(), exact: true })
    .click()
  await dialog.getByRole('button', { name: option, exact: true }).click()
}
async function newBooking(
  page: Page,
  fixture: Awaited<ReturnType<typeof seed>>,
  doctorIndex: number,
  start: string,
) {
  await page.getByRole('button', { name: 'Nueva cita', exact: true }).click()
  await pick(page, 'Paciente', fixture.patient.label)
  await pick(page, 'Odontólogo', fixture.doctors[doctorIndex].fullName)
  await pick(page, 'Servicio', fixture.service.name)
  await page.getByLabel('Inicio de la cita', { exact: true }).fill(start)
  await page.getByRole('button', { name: 'Reservar cita', exact: true }).click()
}
test('two children share a contact, duplicates are rejected and provisional records can be completed', async ({
  page,
}) => {
  test.setTimeout(90000)
  await seed(page)
  const suffix = randomUUID().slice(0, 6)
  await page.goto('/pacientes')
  for (const name of ['Hija ' + suffix, 'Hijo ' + suffix]) {
    await page.getByRole('button', { name: 'Nuevo paciente', exact: true }).click()
    const d = page.getByRole('dialog')
    await d.getByLabel('Nombre completo', { exact: true }).fill(name)
    await d.getByLabel('Fecha de nacimiento', { exact: true }).fill('2020-04-10')
    await d.getByLabel('Nombre del contacto', { exact: true }).fill('Madre ' + suffix)
    await d.getByLabel('Teléfono', { exact: true }).fill('+51911112222')
    await d.getByLabel('Relación con el paciente', { exact: true }).fill('Madre')
    await d.getByLabel('Responsable del menor', { exact: true }).check()
    await d.getByRole('button', { name: 'Guardar paciente', exact: true }).click()
    await expect(d).not.toBeVisible()
  }
  await page.getByLabel('Buscar', { exact: true }).fill('51911112222')
  await expect(page.getByText('2 registros · Página 1 de 1', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Ver ficha', exact: true }).first().click()
  await expect(
    page.getByRole('dialog').getByText('Responsable del menor', { exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Nuevo paciente', exact: true }).click()
  const d = page.getByRole('dialog')
  await d.getByLabel('Nombre completo', { exact: true }).fill('Hija ' + suffix)
  await d.getByLabel('Fecha de nacimiento').fill('2020-04-10')
  await d.getByLabel('Nombre del contacto').fill('Madre ' + suffix)
  await d.getByLabel('Teléfono', { exact: true }).fill('+51911112222')
  await d.getByLabel('Responsable del menor').check()
  await d.getByRole('button', { name: 'Guardar paciente', exact: true }).click()
  await expect(d.getByRole('alert')).toContainText('Ya existe una ficha')
  await expect(d.getByLabel('Nombre completo')).toHaveValue('Hija ' + suffix)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Nuevo paciente', exact: true }).click()
  await page.getByLabel('Nombre completo', { exact: true }).fill('Provisional ' + suffix)
  await page.getByLabel('Ficha provisional').check()
  await page.getByLabel('Nombre del contacto').fill('Contacto')
  await page.getByLabel('Teléfono', { exact: true }).fill('+51922223333')
  await page.getByRole('button', { name: 'Guardar paciente', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByLabel('Buscar', { exact: true }).fill('Provisional ' + suffix)
  await expect(page.getByRole('button', { name: 'Ver ficha', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Ver ficha', exact: true }).click()
  await page.getByRole('button', { name: 'Editar ficha' }).click()
  await page.getByLabel('Fecha de nacimiento').fill('1990-01-01')
  await page.getByLabel('Ficha provisional').uncheck()
  await page.getByRole('button', { name: 'Guardar paciente', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
test('reception completes reservation, confirmation, failed reschedule and cancellation with history', async ({
  page,
}) => {
  test.setTimeout(120000)
  const f = await seed(page)
  await mutate(page, '/api/v1/users', {
    username: 'recep' + f.suffix,
    displayName: 'Recepción agenda',
    email: '',
    password: f.account.password,
    active: true,
    roles: ['RECEPTION'],
  })
  await mutate(page, '/api/v1/auth/logout', undefined)
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  expect(
    (
      await page.request.post('/api/v1/auth/login', {
        form: { username: 'recep' + f.suffix, password: f.account.password },
        headers: { [token.headerName]: token.token },
      })
    ).status(),
  ).toBe(200)
  await page.goto('/agenda')
  await page.getByRole('button', { name: 'Día', exact: true }).click()
  await page.getByLabel('Fecha de referencia').fill('2030-01-07')
  await newBooking(page, f, 0, '2030-01-07T10:00')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const card = page
    .getByRole('button')
    .filter({ hasText: f.patient.fullName })
    .filter({ hasText: '10:00–11:00' })
  await expect(card).toBeVisible()
  await card.click()
  await page.getByRole('button', { name: 'Cambiar estado' }).click()
  await page.getByLabel('Nuevo estado').selectOption('CONFIRMED')
  await page.getByLabel('Motivo del cambio').fill('Confirmación del paciente')
  await page.getByRole('button', { name: 'Guardar estado', exact: true }).click()
  await expect(
    page.getByRole('dialog').getByText('Confirmada', { exact: true }).first(),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await newBooking(page, f, 0, '2030-01-07T10:30')
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('ocupado')
  await page.keyboard.press('Escape')
  await newBooking(page, f, 1, '2030-01-07T10:30')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await newBooking(page, f, 0, '2030-01-07T14:00')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await card.click()
  await page.getByRole('button', { name: 'Reprogramar cita' }).click()
  await page.getByLabel('Nuevo inicio').fill('2030-01-07T14:15')
  await page.getByLabel('Motivo del cambio').fill('Cambiar hora')
  await page.getByRole('button', { name: 'Guardar nuevo horario' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('ocupado')
  await expect(page.getByRole('dialog').getByText('10:00–11:00', { exact: false })).toBeVisible()
  await page.getByLabel('Nuevo inicio').fill('2030-01-07T15:00')
  await page.getByRole('button', { name: 'Guardar nuevo horario' }).click()
  await expect(
    page
      .getByRole('dialog')
      .locator('p')
      .filter({ hasText: /^Reprogramación$/ })
      .first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cambiar estado' }).click()
  await page.getByLabel('Nuevo estado').selectOption('CANCELLED')
  await page.getByLabel('Motivo del cambio').fill('Paciente canceló')
  await page.getByRole('button', { name: 'Guardar estado', exact: true }).click()
  await expect(
    page
      .getByRole('dialog')
      .locator('p')
      .filter({ hasText: /^Cancelación$/ })
      .first(),
  ).toBeVisible()
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Movimiento', exact: true })
    .selectOption('CANCELLED')
  await expect(page.getByRole('dialog').locator('footer').getByRole('status')).toHaveText(
    '1 registros · Página 1 de 1',
  )
  const api = await page.request.get('/api/v1/appointments?patientId=' + f.patient.id)
  const appointments = await api.json()
  const cancelled = appointments.items.find((a: { status: string }) => a.status === 'CANCELLED')
  expect(cancelled.localStart).toBe('2030-01-07T15:00:00')
  await page.goto('/agenda?appointment=' + cancelled.id)
  const linked = page.getByRole('dialog', { name: 'Detalle de la cita' })
  await expect(linked.getByText(f.patient.fullName, { exact: true })).toBeVisible()
  await expect(linked.getByText('Cancelada', { exact: true }).first()).toBeVisible()
  await expect(linked.getByRole('heading', { name: 'Historial de la cita' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(linked).not.toBeVisible()
  expect(new URL(page.url()).searchParams.has('appointment')).toBe(false)
  const refreshedToken = await (await page.request.get('/api/v1/auth/csrf')).json()
  const denied = await page.request.put('/api/v1/services/' + f.service.id, {
    data: { ...f.service, durationMinutes: 30 },
    headers: { [refreshedToken.headerName]: refreshedToken.token },
  })
  expect(denied.status()).toBe(403)
})
for (const width of [1440, 768, 390]) {
  test('patients, all calendar views and keyboard forms at ' + width + 'px', async ({ page }) => {
    test.setTimeout(120000)
    const f = await seed(page)
    await mutate(page, '/api/v1/appointments', {
      patientId: f.patient.id,
      dentistId: f.doctors[0].id,
      serviceId: f.service.id,
      reason: '',
      durationMinutes: null,
      localStart: '2030-01-07T10:00',
      notes: 'Registro para revisión visual',
      requestKey: randomUUID(),
    })
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/pacientes')
    await page.getByLabel('Buscar', { exact: true }).fill(f.suffix)
    await expect(page.getByRole('button', { name: 'Ver ficha', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Ver ficha', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Nuevo paciente', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Nuevo paciente', exact: true })).toBeFocused()
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Día', exact: true }).click()
    await page.getByLabel('Fecha de referencia').fill('2030-01-07')
    for (const view of ['Día', 'Semana', 'Mes', 'Lista']) {
      await page.getByRole('button', { name: view, exact: true }).click()
      if (view === 'Lista') {
        await page.getByLabel('Desde', { exact: true }).fill('2030-01-07')
        await page.getByLabel('Hasta', { exact: true }).fill('2030-01-07')
        await page.getByLabel('Buscar', { exact: true }).fill(f.suffix)
        await expect(page.getByRole('button', { name: 'Ver cita', exact: true })).toHaveCount(1)
        await expect(page.getByRole('button', { name: 'Ver cita', exact: true })).toBeVisible()
      } else await expect(page.getByRole('region', { name: 'Calendario de citas' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([])
    }
    await page.getByRole('button', { name: 'Nueva cita', exact: true }).click()
    await pick(page, 'Paciente', f.patient.label)
    await pick(page, 'Odontólogo', f.doctors[0].fullName)
    await pick(page, 'Servicio', f.service.name)
    await page.getByLabel('Inicio de la cita').fill('2030-01-07T09:00')
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Horarios disponibles' }),
    ).toBeVisible()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Día', exact: true }).click()
    await page.getByRole('button').filter({ hasText: f.patient.fullName }).click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: f.patient.fullName }),
    ).toBeVisible()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.keyboard.press('Escape')
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement | null)?.blur()
      window.scrollTo(0, 0)
    })
    await mkdir('docs/verification/phase2', { recursive: true })
    await page.screenshot({
      path: 'docs/verification/phase2/agenda-' + width + '.png',
      fullPage: true,
    })
    expect(errors).toEqual([])
  })
}
