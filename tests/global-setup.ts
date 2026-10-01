import { chromium, type FullConfig } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
export default async function setup(config: FullConfig) {
  const browser = await chromium.launch({ channel: 'chrome' }),
    page = await browser.newPage()
  try {
    await page.goto(config.projects[0].use.baseURL!)
    await page
      .getByRole('heading', { name: 'Tu consultorio empieza aquí' })
      .waitFor({ timeout: 20000 })
    const password = 'Prueba-' + randomUUID()
    await page.getByLabel('Nombre completo').fill('Administradora de pruebas')
    await page.getByLabel('Usuario', { exact: true }).fill('adminpruebas')
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Crear cuenta y acceder' }).click()
    await page.getByRole('heading', { name: 'Bienvenido a tu consultorio' }).waitFor()
    await mkdir('.runtime', { recursive: true })
    await page.context().storageState({ path: '.runtime/admin-state.json' })
    await writeFile(
      '.runtime/e2e-account.json',
      JSON.stringify({ username: 'adminpruebas', password }),
    )
  } finally {
    await browser.close()
  }
}
