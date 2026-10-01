import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test.use({ hasTouch: true })
import { randomUUID } from 'node:crypto'
import { readFile, mkdir } from 'node:fs/promises'
async function mutate(page: Page, url: string, body: unknown, method = 'POST') {
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  const result = await page.request.fetch(url, {
    method,
    data: body,
    headers: { [token.headerName]: token.token },
  })
  expect(result.ok(), await result.text()).toBeTruthy()
  return result.json()
}
async function seed(page: Page) {
  const suffix = randomUUID().slice(0, 8),
    account = JSON.parse(await readFile('.runtime/e2e-account.json', 'utf8'))
  const user = await mutate(page, '/api/v1/users', {
    username: 'clinical' + suffix,
    displayName: 'Dra. Valeria ' + suffix,
    email: '',
    password: account.password,
    active: true,
    roles: ['DENTIST'],
  })
  const doctor = await mutate(page, '/api/v1/dentists', {
    userId: user.id,
    fullName: 'Dra. Valeria ' + suffix,
    licenseNumber: 'CL' + suffix,
    specialty: 'Odontología general',
    active: true,
    serviceIds: [],
  })
  const patient = await mutate(page, '/api/v1/patients', {
    fullName: 'Paciente clínico ' + suffix,
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
        name: 'Contacto',
        relationship: 'Paciente',
        guardian: false,
        payer: true,
      },
    ],
  })
  const category = await mutate(page, '/api/v1/documents/categories', {
    name: 'Fotografías ' + suffix,
    active: true,
    version: 0,
  })
  return { doctor, patient, category, account, suffix }
}
async function selectDoctor(page: Page, name: string) {
  await page.getByRole('button', { name: 'Seleccionar odontólogo responsable' }).click()
  await page.getByLabel('Buscar opciones').fill(name)
  await page.getByRole('button', { name, exact: true }).click()
}
async function image(page: Page, type = 'image/png', color = '#d6e6dd') {
  return Buffer.from(
    await page.evaluate(
      ({ type, color }) => {
        const canvas = document.createElement('canvas')
        canvas.width = 120
        canvas.height = 80
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 120, 80)
        return canvas.toDataURL(type).split(',')[1]
      },
      { type, color },
    ),
    'base64',
  )
}
function pdf() {
  const newline = String.fromCharCode(10),
    texts = [
      [
        'BT /F1 16 Tf 20 250 Td (DOCUMENTO DE PRUEBA) Tj 0 -35 Td /F1 11 Tf (Copia de consentimiento) Tj 0 -25 Td (Pagina 1) Tj ET',
      ],
      [
        'BT /F1 16 Tf 20 250 Td (DOCUMENTO DE PRUEBA) Tj 0 -35 Td /F1 11 Tf (Continuacion del documento) Tj 0 -25 Td (Pagina 2) Tj ET',
      ],
    ]
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    ...texts.map((lines) => {
      const content = lines.join(newline)
      return [
        '<< /Length ' + Buffer.byteLength(content) + ' >>',
        'stream',
        content,
        'endstream',
      ].join(newline)
    }),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let value = '%PDF-1.4' + newline,
    offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(value))
    value += index + 1 + ' 0 obj' + newline + object + newline + 'endobj' + newline
  }
  const xref = Buffer.byteLength(value)
  value += [
    'xref',
    '0 ' + (objects.length + 1),
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => String(offset).padStart(10, '0') + ' 00000 n '),
    'trailer',
    '<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>',
    'startxref',
    String(xref),
    '%%EOF',
    '',
  ].join(newline)
  return Buffer.from(value)
}
async function upload(
  page: Page,
  patientId: string,
  categoryId: string,
  fileName: string,
  buffer: Buffer,
  recordedOn = '2026-09-29',
) {
  const token = await (await page.request.get('/api/v1/auth/csrf')).json()
  const result = await page.request.post('/api/v1/documents', {
    headers: { [token.headerName]: token.token },
    multipart: {
      metadata: {
        name: 'metadata.json',
        mimeType: 'application/json',
        buffer: Buffer.from(
          JSON.stringify({ patientId, categoryId, recordedOn, description: 'Documento de prueba' }),
        ),
      },
      file: { name: fileName, mimeType: 'application/octet-stream', buffer },
    },
  })
  expect(result.ok(), await result.text()).toBeTruthy()
  return result.json()
}
test('atención: borrador, finalización, corrección y ambas versiones', async ({ page }) => {
  const f = await seed(page)
  await page.goto('/clinica?patientId=' + f.patient.id)
  await selectDoctor(page, f.doctor.fullName)
  await page.getByRole('button', { name: 'Nueva atención', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Motivo de consulta').fill('Control integral')
  await dialog.getByRole('textbox', { name: 'Evolución', exact: true }).fill('Evolución original')
  await dialog
    .getByRole('textbox', { name: 'Diagnósticos', exact: true })
    .fill('Diagnóstico informado')
  await dialog.getByRole('button', { name: 'Añadir procedimiento' }).click()
  await dialog.getByLabel('Descripción del procedimiento 1').fill('Evaluación clínica')
  await dialog.getByLabel('Pieza FDI 1 (opcional)', { exact: true }).fill('11')
  await dialog.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(
    page.getByText('Borrador', { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Ver atención' }).first().click()
  await page.getByRole('button', { name: 'Finalizar atención' }).click()
  await expect(page.getByText('Finalizada · v1').first()).toBeVisible()
  await page.getByRole('button', { name: 'Ver atención' }).first().click()
  await page.getByRole('button', { name: 'Registrar corrección' }).click()
  await page.getByRole('textbox', { name: 'Evolución', exact: true }).fill('Evolución corregida')
  await page.getByLabel('Motivo de la corrección').fill('Se amplió el registro')
  await page.getByRole('button', { name: 'Guardar corrección' }).click()
  await page.getByRole('button', { name: 'Ver atención' }).first().click()
  await page.getByRole('button', { name: 'Consultar versión 1' }).first().click()
  await expect(page.getByText('Evolución original', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Consultar versión 2' }).first().click()
  await expect(page.getByText('Evolución corregida', { exact: true }).last()).toBeVisible()
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations).toEqual([])
})
test('antecedentes y estados del odontograma conservan las fechas y denticiones', async ({
  page,
}) => {
  const f = await seed(page)
  await page.goto('/clinica?patientId=' + f.patient.id)
  await selectDoctor(page, f.doctor.fullName)
  await page.getByRole('button', { name: 'Antecedentes', exact: true }).click()
  await page.getByRole('button', { name: 'Actualizar antecedentes' }).click()
  await page.getByLabel('Alergias informadas').fill('Alergia informada')
  await page.getByLabel('Medicamentos informados').fill('Medicación referida')
  await page.getByLabel('Motivo del registro o actualización').fill('Entrevista inicial')
  await page.getByRole('button', { name: 'Guardar nuevo estado' }).click()
  await expect(page.getByText('Alergia informada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Odontograma', exact: true }).click()
  await page.getByRole('button', { name: 'Actualizar odontograma' }).click()
  await page.getByRole('button', { name: /Pieza 11:/ }).tap()
  await page
    .getByRole('combobox', { name: 'Oclusal / incisal', exact: true })
    .selectOption('CARIES')
  await page.getByRole('button', { name: 'Temporal · 20 piezas' }).click()
  await page.getByRole('button', { name: /Pieza 51:/ }).tap()
  await page.getByRole('combobox', { name: 'Vestibular', exact: true }).selectOption('RESTORATION')
  await page.getByLabel('Fecha del odontograma').fill('2026-09-28')
  await page.getByLabel('Motivo del nuevo estado').fill('Estado inicial')
  await page.getByRole('button', { name: 'Guardar odontograma' }).click()
  await expect(page.getByText('Estado inicial', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Actualizar odontograma' }).click()
  await page.getByRole('button', { name: 'Permanente · 32 piezas' }).click()
  await page.getByRole('button', { name: /Pieza 11:/ }).tap()
  await page
    .getByRole('combobox', { name: 'Oclusal / incisal', exact: true })
    .selectOption('RESTORATION')
  await page.getByLabel('Fecha del odontograma').fill('2026-09-29')
  await page.getByLabel('Motivo del nuevo estado').fill('Control posterior')
  await page.getByRole('button', { name: 'Guardar odontograma' }).click()
  await expect(page.getByText('Control posterior', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Ver estado', exact: true }).nth(1).click()
  await expect(page.getByRole('button', { name: 'Pieza 11: Caries' })).toBeVisible()
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations).toEqual([])
})
test('archivos: carga desde formulario, comparación, PDF, descarga y consentimiento', async ({
  page,
}) => {
  const f = await seed(page)
  await page.goto('/clinica?patientId=' + f.patient.id)
  await page.getByRole('button', { name: 'Archivos', exact: true }).click()
  await page.getByRole('button', { name: 'Adjuntar archivo', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Archivo', { exact: true }).setInputFiles({
    name: 'fotografia-inicial.png',
    mimeType: 'image/png',
    buffer: await image(page),
  })
  await dialog.getByRole('button', { name: 'Seleccionar categoría documental' }).click()
  await dialog.getByLabel('Buscar opciones').fill(f.category.name)
  await dialog.getByRole('button', { name: f.category.name, exact: true }).click()
  await dialog.getByLabel('Fecha del estudio o documento').fill('2026-09-28')
  await dialog.getByLabel('Descripción', { exact: true }).fill('Fotografía inicial')
  await dialog.getByRole('button', { name: 'Guardar archivo' }).click()
  await expect(page.getByText('fotografia-inicial.png', { exact: true }).first()).toBeVisible()
  await upload(
    page,
    f.patient.id,
    f.category.id,
    'fotografia-control.webp',
    await image(page, 'image/webp', '#dfe9f1'),
  )
  const pdfDoc = await upload(page, f.patient.id, f.category.id, 'consentimiento.pdf', pdf())
  await page.reload()
  await page.getByRole('button', { name: 'Archivos', exact: true }).click()
  await page.getByRole('button', { name: 'Elegir fotografía' }).nth(0).click()
  await page.getByRole('button', { name: 'Elegir fotografía' }).nth(0).click()
  await page.getByRole('button', { name: 'Comparar fotografías' }).click()
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(2)
  for (const img of await page.getByRole('dialog').getByRole('img').all())
    await expect(img).toHaveJSProperty('complete', true)
  await page.getByRole('button', { name: 'Cerrar formulario' }).click()
  await page.getByRole('button', { name: 'Consentimientos', exact: true }).click()
  await page.getByRole('button', { name: 'Registrar consentimiento' }).click()
  await page.getByLabel('Nombre del consentimiento').fill('Atención odontológica')
  await page.getByRole('button', { name: 'Seleccionar copia adjunta' }).click()
  await page.getByLabel('Buscar opciones').fill('consentimiento.pdf')
  await page.getByRole('button', { name: 'consentimiento.pdf', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar consentimiento' }).click()
  await expect(page.getByText('Atención odontológica', { exact: true }).first()).toBeVisible()
  const download = await page.request.get(
    '/api/v1/documents/' + pdfDoc.id + '/content?download=true',
  )
  expect(download.headers()['content-type']).toContain('application/pdf')
  expect(await download.body()).toEqual(pdf())
  await page.getByRole('button', { name: 'Archivos', exact: true }).click()
  await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('application/pdf')
  await page.getByRole('button', { name: 'Ver archivo' }).first().click()
  await expect(
    page.getByRole('img', { name: 'Página 1 de 2 del PDF consentimiento.pdf' }),
  ).toHaveJSProperty('naturalWidth', 450)

  await page.getByRole('button', { name: 'Página siguiente' }).click()
  await expect(
    page.getByRole('img', { name: 'Página 2 de 2 del PDF consentimiento.pdf' }),
  ).toHaveJSProperty('naturalWidth', 450)
  await page.getByRole('button', { name: 'Página anterior' }).click()
  await expect(
    page.getByRole('img', { name: 'Página 1 de 2 del PDF consentimiento.pdf' }),
  ).toHaveJSProperty('naturalWidth', 450)
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations).toEqual([])
})
for (const width of [1440, 768, 390]) {
  test('odontograma y formularios accesibles en ' + width + ' px', async ({ page }) => {
    test.slow()
    const f = await seed(page)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    await page.goto('/clinica?patientId=' + f.patient.id)
    await selectDoctor(page, f.doctor.fullName)
    await page.getByRole('button', { name: 'Odontograma', exact: true }).click()
    await page.getByRole('button', { name: 'Actualizar odontograma' }).click()
    await page.getByRole('button', { name: /Pieza 11:/ }).tap()
    await page
      .getByRole('combobox', { name: 'Oclusal / incisal', exact: true })
      .selectOption('CARIES')
    await page.getByLabel('Motivo del nuevo estado').fill('Revisión en ' + width)
    await page.getByRole('button', { name: 'Guardar odontograma' }).click()
    await expect(page.getByText('Revisión en ' + width, { exact: true }).first()).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy()
    const axe = await new AxeBuilder({ page }).analyze()
    expect(axe.violations).toEqual([])
    await mkdir('docs/verification/phase3', { recursive: true })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: 'docs/verification/phase3/odontograma-' + width + '.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Atenciones', exact: true }).click()
    await page.getByRole('button', { name: 'Nueva atención', exact: true }).click()
    await page.getByLabel('Motivo de consulta').fill('Revisión responsiva')
    await page.getByRole('textbox', { name: 'Evolución', exact: true }).fill('Evolución')
    await page.getByRole('textbox', { name: 'Diagnósticos', exact: true }).fill('Diagnóstico')
    await page.getByRole('textbox', { name: 'Evolución', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('textbox', { name: 'Diagnósticos', exact: true })).toBeFocused()
    const formAxe = await new AxeBuilder({ page }).analyze()
    expect(formAxe.violations).toEqual([])
    await page.screenshot({
      path: 'docs/verification/phase3/atencion-' + width + '.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Guardar borrador' }).click()
    await expect(
      page.getByText('Borrador', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible()
    await upload(page, f.patient.id, f.category.id, 'foto-responsiva.png', await image(page))
    await upload(page, f.patient.id, f.category.id, 'documento-responsivo.pdf', pdf())
    await page.getByRole('button', { name: 'Archivos', exact: true }).click()
    await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('image/png')
    await page.getByRole('button', { name: 'Ver archivo' }).first().click()
    await expect(page.getByRole('dialog').getByRole('img')).toHaveJSProperty('complete', true)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy()
    await page.screenshot({
      path: 'docs/verification/phase3/archivo-' + width + '.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Cerrar formulario' }).click()
    await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('application/pdf')
    await page.getByRole('button', { name: 'Ver archivo' }).first().click()
    await expect(
      page.getByRole('img', { name: 'Página 1 de 2 del PDF documento-responsivo.pdf' }),
    ).toHaveJSProperty('naturalWidth', 450)
    await page.screenshot({
      path: 'docs/verification/phase3/pdf-' + width + '.png',
      fullPage: true,
    })
  })
}
test('recepción y caja no pueden abrir el expediente ni descargar por URL', async ({ page }) => {
  const f = await seed(page)
  const file = await upload(page, f.patient.id, f.category.id, 'protegido.png', await image(page))
  for (const role of ['RECEPTION', 'CASHIER']) {
    const user = 'private' + role.toLowerCase() + f.suffix
    await mutate(page, '/api/v1/users', {
      username: user,
      displayName: user,
      email: '',
      password: f.account.password,
      active: true,
      roles: [role],
    })
  }
  const context = page.context()
  for (const role of ['RECEPTION', 'CASHIER']) {
    const token = await (await page.request.get('/api/v1/auth/csrf')).json()
    await page.request.post('/api/v1/auth/logout', { headers: { [token.headerName]: token.token } })
    const csrf = await (await page.request.get('/api/v1/auth/csrf')).json()
    await page.request.post('/api/v1/auth/login', {
      form: { username: 'private' + role.toLowerCase() + f.suffix, password: f.account.password },
      headers: { [csrf.headerName]: csrf.token },
    })
    await page.goto('/clinica?patientId=' + f.patient.id)
    await expect(
      page.getByText('No tienes permiso para consultar el expediente clínico.'),
    ).toBeVisible()
    expect((await context.request.get('/api/v1/documents/' + file.id + '/content')).status()).toBe(
      403,
    )
  }
})

test('configuración clínica y aplicación de plantilla desde la interfaz', async ({ page }) => {
  const f = await seed(page)
  await page.goto('/configuracion/plantillas')
  await page.getByRole('button', { name: 'Añadir plantilla clínica' }).click()
  await page.getByLabel('Nombre de la plantilla', { exact: true }).fill('Plantilla ' + f.suffix)
  await page.getByRole('combobox', { name: 'Uso de la plantilla' }).selectOption('ENCOUNTER')
  await page
    .getByLabel('Contenido de la plantilla', { exact: true })
    .fill('Texto clínico configurable')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(
    page.getByText('Plantilla ' + f.suffix, { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await page.goto('/configuracion/categorias-documentales')
  await page.getByRole('button', { name: 'Añadir categoría documental' }).click()
  await page
    .getByLabel('Nombre de la categoría documental', { exact: true })
    .fill('Informes ' + f.suffix)
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(
    page.getByText('Informes ' + f.suffix, { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await page.goto('/configuracion/almacenamiento')
  await page.getByLabel('Tamaño máximo por archivo (MiB)').fill('12')
  await page.getByRole('button', { name: 'Guardar límite' }).click()
  await expect
    .poll(
      async () => (await (await page.request.get('/api/v1/documents/policy')).json()).maxFileMiB,
    )
    .toBe(12)
  await page.goto('/clinica?patientId=' + f.patient.id)
  await selectDoctor(page, f.doctor.fullName)
  await page.getByRole('button', { name: 'Nueva atención', exact: true }).click()
  await page.getByRole('button', { name: 'Seleccionar plantilla', exact: true }).click()
  await page.getByLabel('Buscar opciones').fill('Plantilla ' + f.suffix)
  await page.getByRole('button', { name: 'Plantilla ' + f.suffix, exact: true }).click()
  await page.getByRole('button', { name: 'Añadir texto de plantilla' }).click()
  await expect(page.getByRole('textbox', { name: 'Anamnesis', exact: true })).toHaveValue(
    'Texto clínico configurable',
  )
})
