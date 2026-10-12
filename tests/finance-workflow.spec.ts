import { test, expect } from './fixtures'
import { randomUUID } from 'node:crypto'
import { readFile, mkdir } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mutate, phase8Sql, dateAdd } from './phase8-seed'

async function seed(page: Page) {
  const suffix = randomUUID().slice(0, 8),
    account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8'))
  const category = await mutate(page, '/api/v1/categories', {
    name: 'Prevención ' + suffix,
    active: true,
  })
  const service = await mutate(page, '/api/v1/services', {
    name: 'Limpieza ' + suffix,
    categoryId: category.id,
    price: 200,
    durationMinutes: 60,
    description: '',
    active: true,
    bookableByAgent: true,
  })
  const user = await mutate(page, '/api/v1/users', {
    username: 'doc' + suffix,
    displayName: 'Julia ' + suffix,
    email: '',
    password: account.password,
    active: true,
    roles: ['DENTIST'],
  })
  const doctor = await mutate(page, '/api/v1/dentists', {
    userId: user.id,
    fullName: 'Julia ' + suffix,
    licenseNumber: 'COL-' + suffix,
    specialty: 'Prevención',
    active: true,
    serviceIds: [service.id],
  })
  const patient = await mutate(page, '/api/v1/patients', {
    fullName: 'Paciente flujo ' + suffix,
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
        name: 'Paciente',
        relationship: 'Paciente',
        guardian: false,
        payer: true,
      },
    ],
  })
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()),
    yesterday = dateAdd(today, -1),
    appointment = randomUUID()
  phase8Sql(
    `INSERT INTO appointment(id,patient_id,dentist_id,service_id,service_name,dentist_name,duration_minutes,starts_at,ends_at,gap_minutes,blocked_until,status,origin,notes,request_key,request_fingerprint) VALUES('${appointment}','${patient.id}','${doctor.id}','${service.id}','${service.name}','${doctor.fullName}',60,'${yesterday} 09:00:00-05','${yesterday} 10:00:00-05',0,'${yesterday} 10:00:00-05','WAITING','MANUAL','',gen_random_uuid(),'fixture');`,
  )
  return { patient, doctor, service, appointment, today }
}
async function attend(page: Page, data: Awaited<ReturnType<typeof seed>>) {
  await page.goto('/agenda?patientId=' + data.patient.id + '&appointment=' + data.appointment)
  await page.getByRole('link', { name: 'Atender esta cita' }).click()
  const editor = page.getByRole('dialog', { name: 'Nueva atención', exact: true })
  await expect(editor.getByLabel('Motivo de consulta')).toHaveValue(data.service.name)
  await expect(
    editor.getByText(
      'Responsable: ' + data.doctor.fullName + '. Puedes atender sin cita para un ingreso directo.',
    ),
  ).toBeVisible()
  await expect(editor.getByLabel('Precio acordado 1 (opcional)')).toHaveValue('200')
  await editor.getByText('Notas clínicas (opcionales)', { exact: true }).click()
  await editor
    .getByLabel('Evolución', { exact: true })
    .fill('Se realizó limpieza dental sin incidencias.')
  await editor
    .getByLabel('Diagnósticos', { exact: true })
    .fill('Control preventivo y placa dental.')
  await editor.getByRole('button', { name: 'Guardar atención', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Detalle de atención', exact: true })).toBeVisible()
}
async function accessible(page: Page, name: string, width: number) {
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await mkdir('docs/verification/finance-workflow', { recursive: true })
  await page.screenshot({
    path: `docs/verification/finance-workflow/${name}-${width}.png`,
    fullPage: true,
  })
}
for (const width of [1440, 768, 390]) {
  test(`appointment to atomic checkout, closure and reopening at ${width}px`, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    const data = await seed(page)
    await attend(page, data)
    await page.getByRole('button', { name: 'Finalizar y cobrar', exact: true }).click()
    const checkout = page.getByRole('dialog', { name: 'Finalizar y cobrar', exact: true })
    await expect(checkout.getByText(/S\/\s*200[.,]00/)).toBeVisible()
    await checkout.getByLabel('Medio de pago').selectOption('TRANSFER')
    await checkout.getByLabel('Referencia del pago').fill('Operación de prueba')
    await accessible(page, 'checkout', width)
    await checkout.getByRole('button', { name: 'Confirmar atención y cobro' }).click()
    await expect(page.getByRole('dialog', { name: 'Detalle de atención' })).toContainText(
      'Finalizada',
    )
    const charges = await (
      await page.request.get(
        '/api/v1/finance/charges?patientId=' + data.patient.id + '&closed=true',
      )
    ).json()
    expect(charges.totalElements).toBe(1)
    expect(Number(charges.items[0].pending)).toBe(0)
    expect(
      (
        await (
          await page.request.get('/api/v1/finance/movements?patientId=' + data.patient.id)
        ).json()
      ).totalElements,
    ).toBe(1)
    await page.goto('/finanzas?patientId=' + data.patient.id)
    await expect(page.getByRole('heading', { name: 'Cuenta activa', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Pagos', exact: true }).click()
    await page.getByRole('button', { name: 'Ver movimiento', exact: true }).click()
    const movement = page.getByRole('dialog', { name: 'Detalle del movimiento', exact: true })
    await expect(movement.getByText(/están aplicados a cargos finalizados/)).toBeVisible()
    await expect(
      movement.getByRole('button', { name: 'Revertir pago', exact: true }),
    ).toBeDisabled()
    await expect(
      movement.getByRole('button', { name: 'Devolver dinero', exact: true }),
    ).toBeDisabled()
    await movement.getByRole('button', { name: 'Cerrar formulario', exact: true }).click()
    await page.getByRole('button', { name: 'Cargos', exact: true }).click()
    await page.getByRole('button', { name: 'Ver resumen histórico' }).click()
    await expect(
      page.getByRole('heading', { name: 'Resumen histórico', exact: true }),
    ).toBeVisible()
    await expect(page.getByText(/S\/\s*200[.,]00/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Ver cuenta activa' }).click()
    await page.getByLabel('Estado del cargo').selectOption('true')
    await page.getByRole('button', { name: 'Reabrir cargo', exact: true }).first().click()
    const reopen = page.getByRole('dialog', { name: 'Reabrir cargo' })
    await reopen
      .getByLabel('Motivo', { exact: true })
      .fill('Corrección de prueba, conservando el historial.')
    await reopen.getByRole('button', { name: 'Reabrir cargo', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Finalizar cargo', exact: true })).toBeVisible()
    await accessible(page, 'active-account', width)
    await page.getByRole('button', { name: 'Finalizar cargo', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Finalizar cargo' })
      .getByRole('button', { name: 'Finalizar cargo', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: 'Finalizar cargo', exact: true }),
    ).not.toBeVisible()
    expect(
      (
        await (
          await page.request.get('/api/v1/finance/charges?patientId=' + data.patient.id)
        ).json()
      ).totalElements,
    ).toBe(0)
  })
  test(`finalize then collect with preselected charges and paid notification at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    const data = await seed(page)
    await attend(page, data)
    await page.getByRole('button', { name: 'Finalizar e ir a cobrar', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Cobro de la atención', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText('1 cargo(s) pendiente(s) de esta atención.', { exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Registrar abono', exact: true }).click()
    const payment = page.getByRole('dialog', { name: 'Registrar abono', exact: true })
    await expect(payment.getByLabel('Importe del abono')).toHaveValue('200.00')
    await expect(payment.getByLabel('Importe aplicado 1')).toHaveValue('200.00')
    await payment.getByLabel('Medio de pago').selectOption('TRANSFER')
    await accessible(page, 'prefilled-payment', width)
    await payment.getByRole('button', { name: 'Guardar abono' }).click()
    await expect(
      page.getByText('El cargo está pagado completamente. Puedes finalizarlo desde Cargos.', {
        exact: true,
      }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cargos', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Finalizar cargo', exact: true })).toBeVisible()
    // Fully paid open charges are also excluded from the payment/advance picker.
    expect(
      (
        await (
          await page.request.get(
            '/api/v1/finance/charges?patientId=' + data.patient.id + '&pendingOnly=true',
          )
        ).json()
      ).totalElements,
    ).toBe(0)
    await page.getByRole('button', { name: 'Finalizar cargo', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Finalizar cargo' })
      .getByRole('button', { name: 'Finalizar cargo', exact: true })
      .click()
  })
}
test('audit essential actions, filters and references at three sizes', async ({ page }) => {
  const data = await seed(page)
  const encounter = await mutate(page, '/api/v1/clinical/encounters', {
    patientId: data.patient.id,
    dentistId: data.doctor.id,
    appointmentId: data.appointment,
    attendedOn: dateAdd(data.today, -1),
    reason: 'Control preventivo',
    version: 0,
    content: {
      anamnesis: '',
      evolution: 'Limpieza sin incidencias.',
      diagnoses: 'Placa dental.',
      indications: 'Control.',
      procedures: [
        { serviceId: data.service.id, description: 'Limpieza dental', quantity: 1, unitPrice: 200 },
      ],
    },
  })
  await mutate(page, '/api/v1/clinical/encounters/' + encounter.id + '/checkout', {
    requestKey: randomUUID(),
    version: encounter.version,
    amount: 200,
    occurredOn: data.today,
    method: 'TRANSFER',
    reference: 'Auditoría de cobro',
  })
  const closedCharges = await (
    await page.request.get('/api/v1/finance/charges?closed=true&patientId=' + data.patient.id)
  ).json()
  const chargeId = closedCharges.items[0].id
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    await page.goto('/configuracion/auditoria')
    await expect(page.getByRole('alert')).toContainText('Esta sección no está disponible')
    const audit = await (await page.request.get('/api/v1/audit-events?search=' + chargeId)).json()
    expect(
      audit.items.filter((event: { action: string }) => event.action === 'CHARGE_CLOSED'),
    ).toHaveLength(1)
    await accessible(page, 'audit', width)
  }
})
