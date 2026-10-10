import { test, expect } from './fixtures'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { seedPhase8, mutate, type Phase8Data } from './phase8-seed'
import { randomUUID } from 'node:crypto'

let data: Phase8Data
test.describe.configure({ mode: 'serial' })
test('prepare coherent operational, clinical and financial records', async ({ page }) => {
  test.setTimeout(120000)
  data = await seedPhase8(page)
  await mkdir('.runtime', { recursive: true })
  await writeFile('.runtime/phase8-data.json', JSON.stringify(data))
})

for (const width of [1440, 768, 390]) {
  test(`dashboard, reports, filters and exports at ${width}px`, async ({ page }) => {
    test.setTimeout(120000)
    data ??= JSON.parse(await readFile('.runtime/phase8-data.json', 'utf8'))
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Panel del consultorio', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Actualizando el panel…')).not.toBeVisible()
    const finance = page.getByRole('region', { name: 'Movimiento financiero', exact: true })
    await expect(finance.getByText(/S\/\s*500[.,]00/).first()).toBeVisible()
    await expect(finance.getByText(/S\/\s*420[.,]00/).first()).toBeVisible()
    await expect(page.getByText('Pendientes de recepción', { exact: true })).toBeVisible()
    await expect(page.getByText('En espera', { exact: true }).first()).toBeVisible()
    const chart = page.getByRole('region', { name: 'Cobros y egresos - PEN', exact: true })
    await chart.getByRole('button').last().click()
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mkdir('docs/verification/phase8', { recursive: true })
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement)?.blur()
      window.scrollTo(0, 0)
    })
    await page.screenshot({
      path: `docs/verification/phase8/dashboard-${width}.png`,
      fullPage: true,
    })
    await page.goto(
      `/reportes?type=COLLECTIONS&from=${data.today}&to=${data.today}&patientId=${data.patient.id}`,
    )
    await expect(page.getByRole('heading', { name: 'Cobros', exact: true })).toBeVisible()
    await expect(page.locator('footer').getByRole('status')).toContainText('2 registros')
    const csv = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click()
    const csvFile = await csv
    const text = await readFile((await csvFile.path())!, 'utf8')
    expect(text).toContain(data.patient.fullName)
    expect(text).toContain('300.00')
    expect(text).toContain('200.00')
    const pdf = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar PDF', exact: true }).click()
    const pdfBytes = await readFile((await (await pdf).path())!)
    expect(pdfBytes.subarray(0, 4).toString()).toBe('%PDF')
    const receipt = page.waitForEvent('download')
    await page
      .getByRole('button', { name: 'Constancia PDF', exact: true })
      .filter({ visible: true })
      .first()
      .click()
    expect((await receipt).suggestedFilename()).toBe('constancia.pdf')
    await page.getByRole('combobox', { name: 'Medio de pago', exact: true }).selectOption('CASH')
    await expect(page.getByText('Sin registros para mostrar')).toBeVisible()
    await page
      .getByRole('combobox', { name: 'Medio de pago', exact: true })
      .selectOption('TRANSFER')
    await expect(page.locator('footer').getByRole('status')).toContainText('2 registros')
    await page.getByLabel('Buscar', { exact: true }).fill('texto sin coincidencias')
    await expect(page.getByText('Sin registros para mostrar')).toBeVisible()
    await page.getByLabel('Buscar', { exact: true }).fill('')
    await expect(page.locator('footer').getByRole('status')).toContainText('2 registros')
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement)?.blur()
      window.scrollTo(0, 0)
    })
    await page.screenshot({ path: `docs/verification/phase8/report-${width}.png`, fullPage: true })
    for (const type of [
      'APPOINTMENTS',
      'ABSENCES',
      'TREATMENTS',
      'SERVICES',
      'CHARGES',
      'EXPENSES',
      'BALANCES',
      'INSTALLMENTS',
    ]) {
      await page.getByRole('combobox', { name: 'Reporte', exact: true }).selectOption(type)
      await expect(page.getByText('Cargando registros…')).not.toBeVisible()
      await expect(page.getByRole('alert')).toHaveCount(0)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })

  test(`patient navigation preserves identity and opens linked records at ${width}px`, async ({
    page,
  }) => {
    data ??= JSON.parse(await readFile('.runtime/phase8-data.json', 'utf8'))
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 })
    await page.goto('/pacientes?patientId=' + data.patient.id)
    const patient = page.getByRole('dialog', { name: 'Ficha del paciente', exact: true })
    await expect(
      patient.getByRole('heading', { name: data.patient.fullName, exact: true }),
    ).toBeVisible()
    await patient
      .getByRole('navigation', { name: 'Áreas del paciente' })
      .getByRole('link', { name: 'Archivos', exact: true })
      .click()
    await expect(patient).not.toBeVisible()
    await expect(
      page.getByRole('heading', { name: data.patient.fullName, exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Adjuntar archivo', exact: true })).toBeVisible()
    await page
      .getByRole('navigation', { name: 'Áreas del paciente' })
      .getByRole('link', { name: 'Tratamientos', exact: true })
      .click()
    expect(new URL(page.url()).searchParams.get('patientId')).toBe(data.patient.id)
    await page
      .getByRole('navigation', { name: 'Áreas del paciente' })
      .getByRole('link', { name: 'Cuenta', exact: true })
      .click()
    await expect(page.getByRole('button', { name: 'Registrar abono', exact: true })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('patientId')).toBe(data.patient.id)
    await page
      .getByRole('navigation', { name: 'Áreas del paciente' })
      .getByRole('link', { name: 'Agenda', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: data.patient.fullName, exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Mes', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(new URL(page.url()).searchParams.get('patientId')).toBe(data.patient.id)
    await page.goto(`/tratamientos?patientId=${data.patient.id}&planId=${data.plan.id}`)
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText(data.plan.code)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    expect(new URL(page.url()).searchParams.get('planId')).toBeNull()
  })
}

test('reception gets an operational dashboard and cannot reveal financial or clinical reports', async ({
  page,
  browser,
}) => {
  const username = 'reception-report-' + randomUUID().slice(0, 8),
    password = 'Prueba-' + randomUUID()
  await mutate(page, '/api/v1/users', {
    username,
    password,
    displayName: 'Recepción de pruebas',
    email: '',
    active: true,
    roles: ['RECEPTION'],
  })
  const context = await browser.newContext()
  try {
    const restricted = await context.newPage()
    await restricted.goto('/agenda')
    await restricted.getByLabel('Usuario', { exact: true }).fill(username)
    await restricted.getByLabel('Contraseña', { exact: true }).fill(password)
    await restricted.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await expect(
      restricted.getByRole('heading', { name: 'Panel del consultorio', exact: true }),
    ).toBeVisible()
    expect(new URL(restricted.url()).pathname).toBe('/')
    await expect(
      restricted.getByRole('heading', { name: 'Movimiento financiero', exact: true }),
    ).toHaveCount(0)
    await restricted.goto('/reportes')
    const options = restricted
      .getByRole('combobox', { name: 'Reporte', exact: true })
      .locator('option')
    await expect(options).toHaveCount(3)
    expect((await restricted.request.get('/api/v1/reports/COLLECTIONS')).status()).toBe(403)
    expect(
      (await restricted.request.get('/api/v1/reports/SERVICES/export?format=CSV')).status(),
    ).toBe(403)
    await restricted.goto('/pacientes?patientId=' + data.patient.id)
    const nav = restricted
      .getByRole('dialog', { name: 'Ficha del paciente', exact: true })
      .getByRole('navigation', { name: 'Áreas del paciente' })
    await expect(nav.getByRole('link', { name: 'Clínica', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Cuenta', exact: true })).toHaveCount(0)
  } finally {
    await context.close()
  }
})
