import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFile, mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { mutate } from './phase8-seed'

test.use({ hasTouch: true })
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
function later(days: number) {
  const d = new Date(today() + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
async function choose(page: Page, label: string, name: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const button = page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: new RegExp('^Seleccionar ' + escaped + '$', 'i') })
  if (await button.count()) {
    await button.click()
    await page
      .getByLabel('Buscar opciones')
      .last()
      .fill(label === 'Paciente' ? name.replace(/^PAC-\d+ · /, '') : name)
    await page.getByRole('button', { name, exact: true }).last().click()
  }
}
async function seed(page: Page) {
  const suffix = randomUUID().slice(0, 8),
    account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8'))
  const user = await mutate(page, '/api/v1/users', {
    username: 'sesion' + suffix,
    displayName: 'Dra. Sesiones ' + suffix,
    email: '',
    password: account.password,
    roles: ['DENTIST'],
    active: true,
  })
  const category = await mutate(page, '/api/v1/categories', {
    name: 'Sesiones ' + suffix,
    active: true,
  })
  const service = await mutate(page, '/api/v1/services', {
    name: 'Control dental ' + suffix,
    categoryId: category.id,
    price: 100,
    durationMinutes: 60,
    description: '',
    active: true,
    bookableByAgent: true,
  })
  const doctor = await mutate(page, '/api/v1/dentists', {
    userId: user.id,
    fullName: user.displayName,
    licenseNumber: 'S-' + suffix,
    specialty: '',
    serviceIds: [service.id],
    active: true,
  })
  for (let day = 1; day <= 7; day++)
    await mutate(page, '/api/v1/schedules/periods', {
      dentistId: doctor.id,
      dayOfWeek: day,
      kind: 'WORK',
      startMinute: 540,
      endMinute: 1020,
      active: true,
    })
  const patient = await mutate(page, '/api/v1/patients/quick', {
    fullName: 'Paciente sesiones ' + suffix,
    phone: '+51976543210',
  })
  return { suffix, doctor, patient, service }
}
for (const width of [1440, 768, 390]) {
  test(`tratamiento con fechas, inicial, cuotas y PDF desde formularios a ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const data = await seed(page),
      title = 'Plan integral ' + data.suffix
    await page.goto('/tratamientos?patientId=' + data.patient.id)
    await page.getByRole('button', { name: 'Nuevo presupuesto', exact: true }).click()
    const form = page.getByRole('dialog', { name: 'Nuevo presupuesto', exact: true })
    await form.getByLabel('Título del presupuesto').fill(title)
    await choose(page, 'Profesional del plan', data.doctor.fullName)
    await choose(page, 'Servicio 1 (opcional)', data.service.name)
    await form
      .getByLabel('Descripción del tratamiento 1', { exact: true })
      .fill('Tratamiento integral ' + data.suffix)
    await form.getByLabel('Precio unitario 1', { exact: true }).fill('900.00')
    await form.getByLabel('Sesiones previstas 1', { exact: true }).fill('3')
    await form.getByText('Programar sesiones 1 (opcional)', { exact: true }).click()
    await form
      .getByLabel('Programación del tratamiento 1', { exact: true })
      .selectOption('FREQUENCY')
    await form.getByLabel('Primera sesión del tratamiento 1', { exact: true }).fill(later(1))
    await form.getByLabel('Repetir cada 1', { exact: true }).fill('2')
    await form.getByLabel('Unidad de frecuencia 1', { exact: true }).selectOption('WEEKS')
    await expect(form.getByText('Fechas previstas', { exact: true })).toBeVisible()
    if (width === 768) {
      await form
        .getByRole('button', { name: 'Ajustar estas fechas individualmente', exact: true })
        .click()
      await expect(
        form.getByLabel('Fecha de la sesión 2 del tratamiento 1 (opcional)', { exact: true }),
      ).toHaveValue(later(15))
      await form
        .getByLabel('Fecha de la sesión 2 del tratamiento 1 (opcional)', { exact: true })
        .fill(later(16))
    }
    await form.getByText('Pago inicial y cuotas (opcional)', { exact: true }).click()
    await form.getByLabel('Pago inicial acordado', { exact: true }).fill('150.00')
    await form.getByText('Distribuir en cuotas mensuales iguales', { exact: true }).click()
    await form.getByLabel('Número de cuotas', { exact: true }).fill('2')
    await form.getByLabel('Primer vencimiento', { exact: true }).fill(later(5))
    await form.getByRole('button', { name: 'Calcular cuotas', exact: true }).click()
    await expect(form.getByLabel('Importe de cuota acordada 1', { exact: true })).toHaveValue(
      '375.00',
    )
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await mkdir('evidence/treatment-adjustments', { recursive: true })
    await page.screenshot({
      path: `evidence/treatment-adjustments/budget-${width}.png`,
      fullPage: true,
    })
    const saved = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/plans') && r.request().method() === 'POST',
    )
    await form.getByRole('button', { name: 'Guardar presupuesto', exact: true }).click()
    const plan = await (await saved).json()
    expect(plan.status).toBe('DRAFT')
    const row = page.getByRole(width < 768 ? 'article' : 'row').filter({ hasText: title })
    await row.getByRole('button', { name: 'Ver plan', exact: true }).click()
    let detail = page.getByRole('dialog', { name: plan.code + ' · ' + title, exact: true })
    const download = page.waitForEvent('download')
    await detail.getByRole('button', { name: 'Descargar presupuesto PDF', exact: true }).click()
    await (await download).saveAs(`.runtime/proforma-draft-${width}.pdf`)
    expect(
      (
        await (
          await page.request.get('/api/v1/finance/movements?patientId=' + data.patient.id)
        ).json()
      ).totalElements,
    ).toBe(0)
    await detail.getByRole('button', { name: 'Presentar presupuesto', exact: true }).click()
    const proposed = page.getByRole('dialog', { name: 'Presentar presupuesto', exact: true })
    await proposed
      .getByLabel('Motivo de la operación', { exact: true })
      .fill('Proforma presentada al paciente')
    await proposed.getByRole('button', { name: 'Presentar presupuesto', exact: true }).click()
    await expect(row).toContainText('Propuesto')
    await row.getByRole('button', { name: 'Ver plan', exact: true }).click()
    detail = page.getByRole('dialog', { name: plan.code + ' · ' + title, exact: true })
    await detail.getByRole('button', { name: 'Aceptar plan', exact: true }).click()
    const acceptance = page.getByRole('dialog', { name: 'Aceptar plan', exact: true })
    await acceptance.getByLabel('Nombre de quien acepta').fill(data.patient.fullName)
    await acceptance
      .getByLabel('Confirmo la aceptación explícita de importes y condiciones')
      .check()
    await acceptance.getByLabel('Medio del pago inicial').selectOption('TRANSFER')
    await acceptance.getByLabel('Confirmo que recibí el pago inicial acordado').check()
    await acceptance
      .getByLabel('Motivo de la operación', { exact: true })
      .fill('Aceptación y pago inicial recibido')
    const accepted = page.waitForResponse((r) => r.url().endsWith('/actions/accept'))
    await acceptance.getByRole('button', { name: 'Aceptar plan', exact: true }).click()
    expect((await accepted).ok()).toBeTruthy()
    await expect(row).toContainText('Aceptado')
    const movements = await (
      await page.request.get('/api/v1/finance/movements?patientId=' + data.patient.id)
    ).json()
    expect(movements.totalElements).toBe(1)
    expect(movements.items[0].amount).toBe(150)
    const dues = await (
      await page.request.get('/api/v1/finance/installments?patientId=' + data.patient.id)
    ).json()
    expect(
      dues.items.map((d: { amount: number }) => d.amount).sort((a: number, b: number) => a - b),
    ).toEqual([150, 375, 375])
    const charges = await (
      await page.request.get('/api/v1/finance/charges?patientId=' + data.patient.id)
    ).json()
    expect(charges.items[0].pending).toBe(750)
    const calendar = await (
      await page.request.get(
        `/api/v1/appointments/calendar?dentistId=${data.doctor.id}&from=${later(1)}&to=${later(29)}`,
      )
    ).json()
    expect(calendar.items).toHaveLength(0)
    expect(calendar.pendingSessions).toHaveLength(3)
    await page.goto('/agenda?patientId=' + data.patient.id)
    await page.getByRole('button', { name: 'Mes', exact: true }).click()
    await page.getByLabel('Fecha de referencia').fill(later(1))
    const calendarRegion = page.getByRole('region', { name: 'Calendario de citas' })
    if (width < 640) {
      await calendarRegion
        .getByRole('button', { name: /^1 citas el / })
        .first()
        .click()
      await page
        .getByRole('dialog')
        .last()
        .getByRole('button', { name: 'Coordinar sesión', exact: true })
        .first()
        .click()
    } else {
      await calendarRegion
        .getByRole('button', { name: new RegExp('Hora pendiente.*' + data.patient.fullName) })
        .first()
        .click()
    }
    const session = page.getByRole('dialog', { name: /Sesión 1 ·/ })
    await expect(session.getByText('Hora pendiente', { exact: false }).first()).toBeVisible()
    await expect(
      session.getByRole('button', { name: 'Asignar hora y reservar cita', exact: true }),
    ).toBeDisabled()
    await session.getByRole('button', { name: '09:00', exact: true }).click()
    await expect(session.getByText('+51976543210', { exact: true })).toBeVisible()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.screenshot({
      path: `evidence/treatment-adjustments/pending-${width}.png`,
      fullPage: false,
    })
    const assigned = page.waitForResponse(
      (r) => r.url().endsWith('/assign') && r.request().method() === 'POST',
    )
    await session.getByRole('button', { name: 'Asignar hora y reservar cita', exact: true }).click()
    const appointment = await (await assigned).json()
    expect(appointment.planItemId).toBeTruthy()
    const booked = page.getByRole('dialog', { name: 'Detalle de la cita', exact: true })
    await expect(booked).toContainText('Sesión 1 de tratamiento')
    await booked.getByRole('link', { name: 'Atender esta cita', exact: true }).click()
    const encounter = page.getByRole('dialog', { name: 'Nueva atención', exact: true })
    await expect(
      encounter.getByLabel('Descripción del procedimiento 1', { exact: true }),
    ).toHaveValue('Tratamiento integral ' + data.suffix)
    await expect(
      encounter
        .getByRole('article')
        .getByText('Tratamiento integral ' + data.suffix, { exact: true }),
    ).toBeVisible()
    await expect(encounter.getByLabel('Precio acordado 1 (opcional)', { exact: true })).toHaveCount(
      0,
    )
    await encounter
      .getByRole('button', { name: 'Consultar atención anterior y pendientes', exact: true })
      .click()
    await expect(encounter).toContainText('Todavía no hay una atención finalizada anterior')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    expect(errors).toEqual([])
  })
  test(`cita de servicio propio conserva descripción y precio a ${width}px`, async ({ page }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    const data = await seed(page)
    const previous = await mutate(page, '/api/v1/clinical/encounters', {
      patientId: data.patient.id,
      dentistId: data.doctor.id,
      appointmentId: null,
      attendedOn: today(),
      reason: 'Control anterior',
      version: 0,
      content: {
        anamnesis: '',
        evolution: 'Buena evolución',
        diagnoses: 'Revisión de restauración',
        indications: 'En la siguiente visita revisar la pieza 16',
        procedures: [],
      },
    })
    await mutate(page, `/api/v1/clinical/encounters/${previous.id}/finalize`, {
      version: previous.version,
    })
    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Nueva cita', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Nueva cita', exact: true })
    await choose(page, 'Paciente', data.patient.code + ' · ' + data.patient.fullName)
    await choose(page, 'Odontólogo', data.doctor.fullName)
    await dialog.getByLabel('Tipo de servicio').selectOption('custom')
    await dialog
      .getByLabel('Descripción del servicio propio')
      .fill('Reparación puntual ' + data.suffix)
    await dialog.getByLabel('Duración del servicio propio (minutos)').fill('30')
    await dialog.getByLabel('Precio acordado (opcional)').fill('75.50')
    await dialog.getByLabel('Inicio de la cita').fill(later(1) + 'T11:00')
    const saved = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/appointments') && r.request().method() === 'POST',
    )
    await dialog.getByRole('button', { name: 'Reservar cita', exact: true }).click()
    const appointment = await (await saved).json()
    expect(appointment.administrative).toBe(false)
    expect(appointment.agreedPrice).toBe(75.5)
    await page.goto('/agenda?appointment=' + appointment.id)
    const detail = page.getByRole('dialog', { name: 'Detalle de la cita', exact: true })
    await expect(detail.getByText('+51976543210', { exact: true })).toBeVisible()
    await detail.getByRole('link', { name: 'Atender esta cita', exact: true }).click()
    const encounter = page.getByRole('dialog', { name: 'Nueva atención', exact: true })
    await expect(
      encounter.getByLabel('Descripción del procedimiento 1', { exact: true }),
    ).toHaveValue('Reparación puntual ' + data.suffix)
    expect(
      Number(
        await encounter.getByLabel('Precio acordado 1 (opcional)', { exact: true }).inputValue(),
      ),
    ).toBe(75.5)
    await encounter
      .getByRole('button', { name: 'Consultar atención anterior y pendientes', exact: true })
      .click()
    await expect(
      encounter.getByText('En la siguiente visita revisar la pieza 16', { exact: true }),
    ).toBeVisible()
    await expect(encounter.getByLabel('Indicaciones', { exact: true })).toHaveValue('')
  })
  test(`avisos de coordinación separan próximas, vencidas y sin fecha a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    const data = await seed(page)
    let plan = await mutate(page, '/api/v1/plans', {
      patientId: data.patient.id,
      dentistId: data.doctor.id,
      title: 'Seguimiento ' + data.suffix,
      conditions: '',
      version: 0,
      requestKey: randomUUID(),
      items: [
        {
          serviceId: data.service.id,
          description: 'Seguimiento de restauración',
          quantity: 1,
          sessions: 3,
          unitPrice: 100,
          durationMinutes: 60,
          scheduling: { mode: 'DATES', dates: [later(-1), later(2), null] },
        },
      ],
    })
    for (const action of ['propose', 'accept'])
      plan = await mutate(page, `/api/v1/plans/${plan.id}/actions/${action}`, {
        version: plan.version,
        requestKey: randomUUID(),
        reason: 'Seguimiento acordado',
        acceptedBy: data.patient.fullName,
      })
    await page.goto('/')
    const pending = page.getByRole('region', { name: 'Sesiones pendientes de horario' })
    await pending
      .getByLabel('Buscar sesiones pendientes', { exact: true })
      .fill(data.patient.fullName)
    const row = pending
      .getByRole(width < 768 ? 'article' : 'row')
      .filter({ hasText: data.patient.fullName })
    await expect(row).toHaveCount(1)
    await expect(row.getByText('Hora pendiente', { exact: true })).toBeVisible()
    await pending.getByRole('combobox', { name: /Avisos de coordinación/ }).selectOption('overdue')
    await expect(row.getByText('Fecha vencida · Hora pendiente', { exact: true })).toBeVisible()
    await pending.getByRole('combobox', { name: /Avisos de coordinación/ }).selectOption('undated')
    await expect(row.getByText('Fecha por coordinar', { exact: true })).toBeVisible()
    await row.getByRole('link', { name: 'Coordinar sesión', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: /Sesión 3 ·/ })
    await expect(
      dialog.getByText('Fecha por coordinar · Hora pendiente', { exact: false }),
    ).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Llamar', exact: true })).toHaveAttribute(
      'href',
      'tel:+51976543210',
    )
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
  })
}
