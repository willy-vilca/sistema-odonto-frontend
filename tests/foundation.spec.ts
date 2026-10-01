import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]

for (const viewport of viewports) {
  test(`real connection, navigation and accessibility at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const failures: string[] = []
    page.on('pageerror', (error) => failures.push(error.message))
    await page.goto('/')
    await expect(page.getByText('Información del consultorio disponible')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bienvenido a tu consultorio' })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    const homeAccessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(homeAccessibility.violations).toEqual([])
    await page.screenshot({ path: `test-results/inicio-${viewport.width}.png`, fullPage: true })

    if (viewport.width < 1024) {
      await page.getByRole('button', { name: 'Abrir menú' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      const menuAccessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(menuAccessibility.violations).toEqual([])
      await page.getByRole('dialog').getByRole('link', { name: 'Agenda', exact: true }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
    } else {
      await page.getByRole('navigation').getByRole('link', { name: 'Agenda', exact: true }).click()
    }
    await expect(page.getByRole('heading', { name: 'Tu agenda comienza aquí' })).toBeVisible()
    await expect(
      page.getByText('Este módulo aún no está implementado.', { exact: false }),
    ).toBeVisible()
    await expect(page.getByRole('main')).toBeFocused()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([])
    await page.getByRole('link', { name: 'Volver al inicio', exact: true }).click()
    await page.keyboard.press('Tab')
    expect(failures).toEqual([])
  })
}

test('loading, connection failure and recovery preserve usable navigation', async ({ page }) => {
  let fail = true
  await page.route('**/api/v1/system/installation', async (route) => {
    if (fail)
      await route.fulfill({
        status: 503,
        contentType: 'application/problem+json',
        body: '{"status":503}',
      })
    else await route.continue()
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('No pudimos conectar')
  fail = false
  await page.getByRole('button', { name: 'Reintentar conexión' }).click()
  await expect(page.getByText('Información del consultorio disponible')).toBeVisible()
  await page.unroute('**/api/v1/system/installation')
  let release: (() => void) | undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/system/installation', async (route) => {
    await gate
    await route.continue()
  })
  await page.reload()
  await expect(page.getByText('Comprobando la conexión del consultorio…')).toBeVisible()
  release?.()
  await expect(page.getByText('Información del consultorio disponible')).toBeVisible()
})

test('mobile menu traps focus, closes with Escape and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const menuButton = page.getByRole('button', { name: 'Abrir menú' })
  await menuButton.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  expect(
    await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement)),
  ).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(menuButton).toBeFocused()
})
