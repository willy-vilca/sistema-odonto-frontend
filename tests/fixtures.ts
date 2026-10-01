import { test as base, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
export const test = base.extend<{ authenticated: void }>({
  authenticated: [
    async ({ page }, use) => {
      const account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8')) as {
        username: string
        password: string
      }
      const token = await (await page.request.get('/api/v1/auth/csrf')).json()
      const response = await page.request.post('/api/v1/auth/login', {
        form: account,
        headers: { [token.headerName]: token.token },
      })
      expect(response.status()).toBe(200)
      await use()
    },
    { auto: true },
  ],
})
export { expect }
