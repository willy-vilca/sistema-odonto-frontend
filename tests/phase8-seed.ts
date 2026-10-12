import { execFileSync } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { expect } from './fixtures'

export interface Phase8Data {
  patient: { id: string; fullName: string; code: string }
  doctor: { id: string; fullName: string }
  plan: { id: string; code: string }
  today: string
  appointment: string
}
export async function mutate(page: Page, path: string, body: unknown, method = 'POST') {
  const csrf = await (await page.request.get('/api/v1/auth/csrf')).json()
  const response = await page.request.fetch(path, {
    method,
    data: body,
    headers: { [csrf.headerName]: csrf.token },
  })
  expect(response.ok(), await response.text()).toBe(true)
  return response.json()
}
export function phase8Sql(sql: string) {
  const psql = 'C:/Program Files/PostgreSQL/18/bin/psql.exe',
    options = {
      env: { ...process.env, PGPASSWORD: 'admin', PGCLIENTENCODING: 'UTF8' },
      encoding: 'utf8' as const,
    }
  expect(
    execFileSync(
      psql,
      [
        '-h',
        'localhost',
        '-U',
        'postgres',
        '-d',
        'sistema_odonto_mini_test',
        '-Atc',
        'SELECT current_database()',
      ],
      options,
    ).trim(),
  ).toBe('sistema_odonto_mini_test')
  return execFileSync(
    psql,
    [
      '-h',
      'localhost',
      '-U',
      'postgres',
      '-d',
      'sistema_odonto_mini_test',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
      '-f',
      '-',
    ],
    { ...options, input: Buffer.from(sql, 'utf8') },
  ).trim()
}
export async function seedPhase8(page: Page): Promise<Phase8Data> {
  const suffix = randomUUID().slice(0, 6)
  const today = (await (await page.request.get('/api/v1/dashboard')).json()).today as string
  const category = await mutate(page, '/api/v1/categories', {
    name: 'Prevención ' + suffix,
    active: true,
  })
  const service = await mutate(page, '/api/v1/services', {
    categoryId: category.id,
    name: 'Limpieza dental ' + suffix,
    price: 200,
    durationMinutes: 60,
    description: '',
    bookableByAgent: true,
    active: true,
  })
  const user = await mutate(page, '/api/v1/users', {
    username: 'julia-' + suffix,
    displayName: 'Julia Huaytalla',
    password: 'Prueba-' + randomUUID(),
    email: '',
    active: true,
    roles: ['DENTIST'],
  })
  const doctor = await mutate(page, '/api/v1/dentists', {
    userId: user.id,
    fullName: 'Julia Huaytalla ' + suffix,
    licenseNumber: 'COP-' + suffix,
    specialty: 'Odontología general',
    serviceIds: [service.id],
    active: true,
  })
  const patient = await mutate(page, '/api/v1/patients', {
    fullName: 'Carlos Ruiz Vega ' + suffix,
    birthDate: '1990-05-12',
    documentType: '',
    documentNumber: '',
    address: 'Av. Las Sonrisas 120',
    email: '',
    emergencyName: '',
    emergencyPhone: '',
    notes: '',
    provisional: false,
    active: true,
    contacts: [
      {
        phone: '+51999998888',
        name: 'Carlos Ruiz Vega',
        relationship: 'Paciente',
        guardian: false,
        payer: true,
      },
    ],
  })
  let plan = await mutate(page, '/api/v1/plans', {
    patientId: patient.id,
    dentistId: doctor.id,
    title: 'Plan preventivo ' + suffix,
    conditions: 'Seis unidades acordadas en tres sesiones.',
    version: 0,
    requestKey: randomUUID(),
    items: [
      {
        serviceId: service.id,
        description: 'Tratamiento preventivo',
        quantity: 6,
        sessions: 3,
        unitPrice: 200,
      },
    ],
  })
  plan = await mutate(page, `/api/v1/plans/${plan.id}/actions/propose`, {
    version: plan.version,
    requestKey: randomUUID(),
    reason: 'Presentar presupuesto',
  })
  plan = await mutate(page, `/api/v1/plans/${plan.id}/actions/accept`, {
    version: plan.version,
    requestKey: randomUUID(),
    reason: 'Acuerdo confirmado',
    acceptedBy: patient.fullName,
  })
  const charge = (await (await page.request.get('/api/v1/charges?patientId=' + patient.id)).json())
    .items[0]
  for (const amount of [300, 200])
    await mutate(page, '/api/v1/finance/payments', {
      requestKey: randomUUID(),
      patientId: patient.id,
      amount,
      currency: 'PEN',
      occurredOn: today,
      method: 'TRANSFER',
      reference: 'AB-' + suffix + '-' + amount,
      description: 'Abono ' + suffix,
      allocations: [{ chargeId: charge.id, amount }],
    })
  await mutate(page, '/api/v1/finance/installments', {
    requestKey: randomUUID(),
    chargeId: charge.id,
    reason: 'Dos cuotas acordadas',
    installments: [
      { amount: 600, dueOn: dateAdd(today, -1) },
      { amount: 600, dueOn: dateAdd(today, 30) },
    ],
  })
  const item = (await (await page.request.get(`/api/v1/plans/items?planId=${plan.id}`)).json())
    .items[0]
  for (const linked of [true, false]) {
    let encounter = await mutate(page, '/api/v1/clinical/encounters', {
      patientId: patient.id,
      dentistId: doctor.id,
      attendedOn: today,
      reason: linked ? 'Sesión del plan' : 'Atención individual',
      version: 0,
      content: {
        anamnesis: '',
        evolution: 'Atención completada sin incidencias.',
        diagnoses: 'Control odontológico ficticio.',
        indications: 'Continuar cuidados habituales.',
        procedures: [
          {
            serviceId: service.id,
            description: linked ? 'Primera sesión preventiva' : 'Limpieza individual',
            quantity: 1,
            unitPrice: 200,
            ...(linked ? { planItemId: item.id } : {}),
          },
        ],
      },
    })
    encounter = await mutate(page, `/api/v1/clinical/encounters/${encounter.id}/finalize`, {
      version: encounter.version,
    })
  }
  const expenseCategory = await mutate(page, '/api/v1/finance/expense-categories', {
    name: 'Materiales ' + suffix,
    active: true,
  })
  await mutate(page, '/api/v1/finance/expenses', {
    requestKey: randomUUID(),
    categoryId: expenseCategory.id,
    amount: 80,
    currency: 'PEN',
    occurredOn: today,
    method: 'TRANSFER',
    reference: 'EG-' + suffix,
    description: 'Materiales de atención',
    supplier: 'Proveedor ficticio',
  })
  const appointment = randomUUID()
  phase8Sql(
    `INSERT INTO appointment(id,patient_id,dentist_id,service_id,service_name,dentist_name,duration_minutes,starts_at,ends_at,gap_minutes,blocked_until,status,origin,notes,request_key,request_fingerprint) VALUES('${appointment}','${patient.id}','${doctor.id}','${service.id}','Limpieza dental','Julia Huaytalla',60,'${today} 09:00:00-05','${today} 10:00:00-05',0,'${today} 10:00:00-05','WAITING','MANUAL','',gen_random_uuid(),'fixture');`,
  )
  const payload = JSON.stringify({
    phone_number_id: '123456789012345',
    message: {
      id: 'wamid.' + randomUUID(),
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: 'text',
      from: '51999998888',
      text: { body: 'Necesito ayuda de recepción con mi cita.' },
      kapso: { direction: 'inbound', status: 'delivered' },
    },
    conversation: {
      phone_number_id: '123456789012345',
      phone_number: '+51999998888',
      contact_name: 'Familia de demostración',
    },
  })
  const received = await page.request.post('/api/v1/integrations/kapso/events', {
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': createHmac('sha256', 'kapso-webhook-unit-secret-32-characters')
        .update(payload)
        .digest('hex'),
      'X-Webhook-Event': 'whatsapp.message.received',
      'X-Webhook-Payload-Version': 'v2',
      'X-Idempotency-Key': randomUUID(),
    },
  })
  expect(received.status(), await received.text()).toBe(200)
  phase8Sql(
    "UPDATE agent_supervision SET mode='HANDOFF',reason='Solicitud de atención manual'; UPDATE agent_run SET state='PAUSED' WHERE state='QUEUED';",
  )
  return { patient, doctor, plan, today, appointment }
}
export function dateAdd(date: string, days: number) {
  const result = new Date(date + 'T12:00:00Z')
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}
