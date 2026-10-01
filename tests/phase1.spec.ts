import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import AxeBuilder from '@axe-core/playwright'
import { readFile, mkdir } from 'node:fs/promises'
async function editor(page: Page, path: string, singular: string) {
  await page.goto('/configuracion/' + path)
  await page.getByRole('button', { name: 'Añadir ' + singular, exact: true }).click()
  return page.getByRole('dialog', { name: 'Crear ' + singular, exact: true })
}
async function save(page: Page) {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Guardar cambios', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Cambios guardados correctamente.')).toBeVisible()
}
async function pick(page: Page, label: string, option: string) {
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Seleccionar ' + label.toLowerCase(), exact: true })
    .click()
  await dialog.getByRole('button', { name: option, exact: true }).click()
}
test('configuration, two dentists, assigned services, schedules, history and restricted access', async ({
  page,
}) => {
  test.setTimeout(120000)
  const account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8')) as {
    username: string
    password: string
  }
  await page.goto('/configuracion/consultorio')
  await page.getByLabel('Nombre del consultorio', { exact: true }).fill('Clínica Sonrisa')
  await page.getByLabel('Dirección', { exact: true }).fill('Av. del Cuidado 120')
  await page.getByLabel('Color principal', { exact: true }).fill('#234269')
  await page.getByLabel('Anticipación mínima (minutos)', { exact: true }).fill('90')
  await page.getByLabel('Separación entre citas (minutos)', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click()
  await expect(page.getByText('Configuración guardada correctamente.')).toBeVisible()
  await expect(page.getByRole('banner')).toContainText('Clínica Sonrisa')
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-brand-700').trim(),
    ),
  ).toBe('#234269')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV3sAAAAASUVORK5CYII=',
    'base64',
  )
  await page
    .getByLabel('Subir logo', { exact: true })
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByText('Logo actualizado.', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Logo del consultorio' })).toBeVisible()
  let dialog = await editor(page, 'categorias', 'categoría')
  await dialog.getByLabel('Nombre de la categoría').fill('Atención general')
  await save(page)
  for (const [name, price, duration] of [
    ['Evaluación integral', '85.50', '45'],
    ['Limpieza dental', '120.00', '60'],
  ]) {
    dialog = await editor(page, 'servicios', 'servicio')
    await dialog.getByLabel('Nombre del servicio').fill(name)
    await pick(page, 'Categoría', 'Atención general')
    await dialog.getByLabel('Precio (PEN)').fill(price)
    await dialog.getByLabel('Duración en minutos').fill(duration)
    await dialog.getByLabel('Permitir reserva automática').check()
    await save(page)
  }
  for (const [username, name, role] of [
    ['doctoraana', 'Dra. Ana Torres', 'Odontólogo'],
    ['doctorluis', 'Dr. Luis Rojas', 'Odontólogo'],
    ['recepcionprueba', 'María Recepción', 'Recepción'],
  ]) {
    dialog = await editor(page, 'usuarios', 'usuario')
    await dialog.getByLabel('Nombre completo').fill(name)
    await dialog.getByLabel('Usuario', { exact: true }).fill(username)
    await dialog.getByLabel('Contraseña', { exact: true }).fill(account.password)
    if (role === 'Odontólogo') {
      await dialog.getByLabel('Recepción', { exact: true }).uncheck()
      await dialog.getByLabel('Odontólogo', { exact: true }).check()
    }
    await save(page)
  }
  for (const [name, license, service] of [
    ['Dra. Ana Torres', 'COP-100', 'Evaluación integral'],
    ['Dr. Luis Rojas', 'COP-101', 'Limpieza dental'],
  ]) {
    dialog = await editor(page, 'odontologos', 'odontólogo')
    await dialog.getByLabel('Nombre del profesional').fill(name)
    await dialog.getByLabel('Registro profesional').fill(license)
    await pick(page, 'Cuenta del odontólogo', name)
    await pick(page, 'Servicios habilitados', service)
    await save(page)
  }
  await expect(page.getByRole('main')).toContainText('Dra. Ana Torres')
  await expect(page.getByRole('main')).toContainText('Dr. Luis Rojas')
  for (const [kind, start, end] of [
    ['WORK', '09:00', '17:00'],
    ['BREAK', '12:00', '13:00'],
  ]) {
    dialog = await editor(page, 'horarios', 'horario')
    await pick(page, 'Odontólogo', 'Dra. Ana Torres')
    await dialog.getByLabel('Tipo de horario').selectOption(kind)
    await dialog.getByLabel('Hora de inicio').fill(start)
    await dialog.getByLabel('Hora de fin').fill(end)
    await save(page)
  }
  dialog = await editor(page, 'horarios', 'horario')
  await pick(page, 'Odontólogo', 'Dra. Ana Torres')
  await dialog.getByLabel('Hora de inicio').fill('10:00')
  await dialog.getByLabel('Hora de fin').fill('11:00')
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByLabel('Hora de inicio')).toHaveValue('10:00')
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
  dialog = await editor(page, 'bloqueos', 'bloqueo')
  await dialog.getByLabel('Fecha inicial').fill('2026-12-25')
  await dialog.getByLabel('Fecha final').fill('2026-12-25')
  await dialog.getByLabel('Motivo').fill('Feriado del consultorio')
  await save(page)
  dialog = await editor(page, 'bloqueos', 'bloqueo')
  await dialog.getByLabel('Tipo de bloqueo').selectOption('ABSENCE')
  await pick(page, 'Odontólogo', 'Dr. Luis Rojas')
  await dialog.getByLabel('Fecha inicial').fill('2026-12-01')
  await dialog.getByLabel('Fecha final').fill('2026-12-01')
  await dialog.getByLabel('Hora inicial (opcional)').fill('09:00')
  await dialog.getByLabel('Hora final (opcional)').fill('11:00')
  await dialog.getByLabel('Motivo').fill('Ausencia personal')
  await save(page)
  await page.goto('/configuracion/servicios')
  await page
    .getByRole('row')
    .filter({ hasText: 'Evaluación integral' })
    .getByRole('button', { name: 'Editar' })
    .click()
  await page.getByRole('dialog').getByLabel('Servicio activo').uncheck()
  await save(page)
  await expect(page.getByRole('row').filter({ hasText: 'Evaluación integral' })).toContainText(
    'Inactivo',
  )
  await page.goto('/configuracion/odontologos')
  await page
    .getByRole('row')
    .filter({ hasText: 'Dra. Ana Torres' })
    .getByRole('button', { name: 'Editar' })
    .click()
  await page.getByRole('dialog').getByLabel('Profesional activo').uncheck()
  await save(page)
  await expect(page.getByRole('row').filter({ hasText: 'Dra. Ana Torres' })).toContainText(
    'Evaluación integral',
  )
  await page.goto('/configuracion/auditoria')
  await page.getByRole('searchbox', { name: 'Buscar', exact: true }).fill('Creó')
  await expect(page.getByRole('main')).toContainText('SERVICE_CREATED')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible()
  await page.getByLabel('Usuario', { exact: true }).fill('recepcionprueba')
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Bienvenido a tu consultorio' })).toBeVisible()
  await page.goto('/configuracion/servicios')
  await expect(page.getByRole('button', { name: 'Añadir servicio' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Auditoría', exact: true })).toHaveCount(0)
  const denied = await page.request.get('/api/v1/users')
  expect(denied.status()).toBe(403)
  await page.getByRole('button', { name: 'Ver detalle' }).first().click()
  await expect(page.getByRole('dialog').getByLabel('Nombre del servicio')).toBeDisabled()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }),
  ).toHaveCount(0)
})
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]) {
  test(
    'configuration forms, touch controls and keyboard at ' + viewport.width,
    async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/configuracion/consultorio')
      await expect(page.getByLabel('Nombre del consultorio')).toBeVisible()
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await mkdir('docs/verification/phase1', { recursive: true })
      if ([1440, 768, 390].includes(viewport.width))
        await page.screenshot({
          path: 'docs/verification/phase1/consultorio-' + viewport.width + '.png',
          fullPage: true,
        })
      const dialog = await editor(page, 'servicios', 'servicio')
      await expect(dialog.getByLabel('Nombre del servicio')).toBeVisible()
      await pick(page, 'Categoría', 'Atención general')
      await dialog.getByLabel('Nombre del servicio').fill('Borrador de revisión')
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      await expect(page.getByRole('button', { name: 'Añadir servicio' })).toBeFocused()
      for (const [route, singular] of [
        ['usuarios', 'usuario'],
        ['odontologos', 'odontólogo'],
        ['categorias', 'categoría'],
        ['horarios', 'horario'],
        ['bloqueos', 'bloqueo'],
      ]) {
        const other = await editor(page, route, singular)
        expect(
          (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
            .violations,
        ).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        await page.keyboard.press('Tab')
        expect(await other.evaluate((element) => element.contains(document.activeElement))).toBe(
          true,
        )
        await page.keyboard.press('Escape')
        await expect(other).not.toBeVisible()
      }
      await page.goto('/configuracion/roles')
      await page.getByRole('button', { name: 'Editar', exact: true }).first().click()
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([])
      await page.keyboard.press('Escape')
      await page.goto('/configuracion/auditoria')
      await expect(page.getByRole('heading', { name: 'Auditoría de operaciones' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    },
  )
}
test('list search and pagination request only the current page on the server', async ({ page }) => {
  await page.goto('/configuracion/usuarios')
  const search = page.waitForResponse(
    (r) => r.url().includes('/api/v1/users?') && r.url().includes('search=Ana'),
  )
  await page.getByRole('searchbox', { name: 'Buscar', exact: true }).fill('Ana')
  const response = await search
  const result = await response.json()
  expect(result.items.length).toBe(1)
  expect(result.totalElements).toBe(1)
  expect(new URL(response.url()).searchParams.get('size')).toBe('20')
  await expect(page.getByRole('main')).toContainText('Dra. Ana Torres')
  await page.getByRole('searchbox', { name: 'Buscar', exact: true }).fill('')
  await page.getByLabel('Estado', { exact: true }).selectOption('false')
  await expect(page.getByText('Sin registros para mostrar')).toBeVisible()
})

test('changing page loads ten services and then only the remaining page', async ({ page }) => {
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  const categories = await (
    await page.request.get('/api/v1/categories?size=10&search=Atenci')
  ).json()
  for (let i = 0; i < 9; i++) {
    const response = await page.request.post('/api/v1/services', {
      headers: { [token.headerName]: token.token },
      data: {
        name: 'Servicio de prueba ' + i,
        categoryId: categories.items[0].id,
        price: 10,
        durationMinutes: 15,
        description: '',
        bookableByAgent: false,
        active: true,
      },
    })
    expect(response.status()).toBe(201)
  }
  await page.goto('/configuracion/servicios')
  await page.getByLabel('Por página', { exact: true }).selectOption('10')
  await expect(page.getByRole('status').filter({ hasText: 'Página 1 de 2' })).toBeVisible()
  const second = page.waitForResponse(
    (r) =>
      r.url().includes('/api/v1/services?') && new URL(r.url()).searchParams.get('page') === '1',
  )
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  const response = await second,
    result = await response.json()
  expect(result.items.length).toBe(1)
  expect(result.totalElements).toBe(11)
  expect(new URL(response.url()).searchParams.get('size')).toBe('10')
  await expect(page.getByRole('status').filter({ hasText: 'Página 2 de 2' })).toBeVisible()
})
