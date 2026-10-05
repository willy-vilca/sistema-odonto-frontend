import { randomUUID } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

async function mutate(page: Page, url: string, body: unknown, method = 'POST') {
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  const response = await page.request.fetch(url, {
    method,
    data: body,
    headers: { [token.headerName]: token.token },
  })
  expect(response.ok(), await response.text()).toBe(true)
  return response.json()
}

async function seed(page: Page, appointments: number) {
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
    name: 'Listas ' + suffix,
    active: true,
  })
  const services = []
  for (let i = 1; i <= 21; i++) {
    services.push(
      await mutate(page, '/api/v1/services', {
        name: `Servicio ${String(i).padStart(2, '0')} ${suffix}`,
        categoryId: category.id,
        price: 100,
        durationMinutes: 15,
        description: '',
        bookableByAgent: true,
        active: true,
      }),
    )
  }
  const doctors = []
  for (let i = 0; i < 2; i++) {
    const user = await mutate(page, '/api/v1/users', {
      username: 'compact' + i + suffix,
      displayName: 'Profesional ' + i + suffix,
      password: account.password,
      email: '',
      roles: ['DENTIST'],
      active: true,
    })
    doctors.push(
      await mutate(page, '/api/v1/dentists', {
        userId: user.id,
        fullName: `Dra. ${i ? 'Beatriz' : 'Adriana'} ${suffix}`,
        licenseNumber: 'LIST-' + i + suffix,
        specialty: 'Odontología integral',
        serviceIds: i ? services.slice(0, 3).map((s) => s.id) : services.map((s) => s.id),
        active: true,
      }),
    )
    await mutate(page, '/api/v1/schedules/periods', {
      dentistId: doctors[i].id,
      dayOfWeek: 1,
      kind: 'WORK',
      startMinute: 540,
      endMinute: 1080,
      active: true,
    })
  }
  await mutate(
    page,
    '/api/v1/services/' + services[20].id,
    { ...services[20], active: false },
    'PUT',
  )
  const patient = await mutate(page, '/api/v1/patients', {
    fullName: 'Paciente de agenda mensual ' + suffix,
    birthDate: '1990-01-01',
    documentType: '',
    documentNumber: '',
    email: '',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    notes: '',
    active: true,
    provisional: false,
    contacts: [
      {
        name: 'Contacto',
        phone: '+51999998888',
        relationship: 'Paciente',
        guardian: false,
        payer: true,
      },
    ],
  })
  const date = '2030-01-07'
  for (let i = 0; i < appointments; i++) {
    const minute = 540 + i * 15
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
    await mutate(page, '/api/v1/appointments', {
      patientId: patient.id,
      dentistId: doctors[0].id,
      serviceId: services[0].id,
      localStart: `${date}T${time}`,
      reason: '',
      durationMinutes: null,
      notes: 'Cita ' + (i + 1),
      requestKey: randomUUID(),
    })
  }
  await mutate(page, '/api/v1/appointments', {
    patientId: patient.id,
    dentistId: doctors[1].id,
    serviceId: services[0].id,
    localStart: `${date}T09:00`,
    reason: '',
    durationMinutes: null,
    notes: 'Cita de otro profesional',
    requestKey: randomUUID(),
  })
  return { suffix, services, doctors, patient, date }
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
}

for (const width of [1440, 768, 390]) {
  test(`compact services and monthly appointments preserve detail and paging at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(180000)
    const count = width === 1440 ? 21 : 5
    const f = await seed(page, count)
    await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/configuracion/odontologos')
    await page.getByLabel('Buscar', { exact: true }).fill(f.doctors[0].fullName)
    const trigger = page.getByRole('button', {
      name: 'Ver servicios de ' + f.doctors[0].fullName,
      exact: true,
    })
    await expect(trigger).toBeVisible()
    const summary = page
      .getByRole('list', { name: 'Resumen de servicios asignados' })
      .filter({ visible: true })
    await expect(summary.getByRole('listitem')).toHaveCount(3)
    await expect(summary).toContainText(f.services[0].name)
    await expect(summary).not.toContainText(f.services[3].name)
    await noOverflow(page)
    await trigger.click()
    const serviceDialog = page.getByRole('dialog', {
      name: 'Servicios del odontólogo',
      exact: true,
    })
    await expect(serviceDialog.locator('footer').getByRole('status')).toContainText('21 registros')
    await serviceDialog.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(serviceDialog).toContainText(f.services[20].name)
    await serviceDialog.getByLabel('Estado del servicio').selectOption('false')
    await expect(serviceDialog.locator('footer').getByRole('status')).toContainText('1 registros')
    await serviceDialog.getByLabel('Buscar', { exact: true }).fill('no existe ' + f.suffix)
    await expect(serviceDialog).toContainText('Sin registros para mostrar')
    await serviceDialog.getByLabel('Buscar', { exact: true }).fill('')
    await expect(serviceDialog).toContainText(f.services[20].name)
    await noOverflow(page)
    await mkdir('docs/verification/compact-lists', { recursive: true })
    await page.screenshot({
      path: `docs/verification/compact-lists/services-${width}.png`,
      fullPage: true,
    })
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()

    await page.goto('/agenda')
    await page.getByRole('button', { name: 'Mes', exact: true }).click()
    await page.getByLabel('Fecha de referencia').fill(f.date)
    await page.getByRole('button', { name: 'Seleccionar odontólogo', exact: true }).click()
    await page.getByRole('button', { name: f.doctors[0].fullName, exact: true }).click()
    const calendar = page.getByRole('region', { name: 'Calendario de citas' })
    await expect(
      calendar.getByRole('button', {
        name: new RegExp('Ver ' + (count - 3) + ' citas más'),
        includeHidden: true,
      }),
    ).toBeAttached()
    const day = calendar.getByRole('button', { name: /^Ver día.*\b7\b.*ene/ }).locator('..')
    // The month keeps three previews on wide screens and a count on phones.
    await expect(
      day.getByRole('button', { name: new RegExp(f.patient.fullName), includeHidden: true }),
    ).toHaveCount(3)
    const opener =
      width >= 640
        ? calendar.getByRole('button', { name: new RegExp('Ver ' + (count - 3) + ' citas más') })
        : day.getByRole('button', { name: new RegExp('^' + count + ' citas el') })
    await noOverflow(page)
    await page.screenshot({
      path: `docs/verification/compact-lists/month-${width}.png`,
      fullPage: true,
    })
    await opener.click()
    const dayDialog = page.getByRole('dialog', { name: 'Citas del 07/01/2030', exact: true })
    await expect(dayDialog.locator('footer').getByRole('status')).toContainText(
      count + ' registros',
    )
    if (count > 20) {
      await dayDialog.getByRole('button', { name: 'Siguiente', exact: true }).click()
      await expect(dayDialog.getByRole('button', { name: 'Ver cita', exact: true })).toHaveCount(1)
      await dayDialog.getByRole('button', { name: 'Anterior', exact: true }).click()
    }
    await dayDialog.getByLabel('Buscar', { exact: true }).fill(f.patient.fullName)
    await dayDialog.getByRole('button', { name: 'Ver cita', exact: true }).first().click()
    const detail = page.getByRole('dialog', { name: 'Detalle de la cita', exact: true })
    await expect(detail.getByRole('heading', { name: 'Historial de la cita' })).toBeVisible()
    await expect(detail).toContainText('Cita 1')
    await noOverflow(page)
    await detail.getByRole('button', { name: 'Cambiar estado', exact: true }).click()
    await detail.getByLabel('Nuevo estado').selectOption('CONFIRMED')
    await detail.getByLabel('Motivo del cambio').fill('Confirmación desde lista mensual')
    await detail.getByRole('button', { name: 'Guardar estado', exact: true }).click()
    await expect(detail.getByText('Confirmada', { exact: true }).first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(detail).not.toBeVisible()
    await expect(dayDialog).toBeVisible()
    await expect
      .poll(() => dayDialog.evaluate((dialog) => dialog.contains(document.activeElement)))
      .toBe(true)
    await expect(dayDialog.getByLabel('Buscar', { exact: true })).toHaveValue(f.patient.fullName)
    await dayDialog.getByLabel('Estado de la cita').selectOption('CONFIRMED')
    await expect(dayDialog.locator('footer').getByRole('status')).toContainText('1 registros')
    await noOverflow(page)
    await page.screenshot({
      path: `docs/verification/compact-lists/day-dialog-${width}.png`,
      fullPage: true,
    })
    await page.keyboard.press('Escape')
    await expect(dayDialog).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Mes', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(errors).toEqual([])
  })
}
