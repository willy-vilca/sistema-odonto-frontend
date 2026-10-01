export class ApiError extends Error {
  readonly status: number
  readonly requestId?: string
  readonly fields: Record<string, string>
  constructor(
    message: string,
    status: number,
    requestId?: string,
    fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
    this.fields = fields
  }
}
let csrf: { headerName: string; token: string } | undefined
export function resetCsrf() {
  csrf = undefined
}
async function fetchResponse(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (options.method && !['GET', 'HEAD'].includes(options.method)) {
    csrf ??= await request('/api/v1/auth/csrf')
    headers.set(csrf!.headerName, csrf!.token)
  }
  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin',
      signal: AbortSignal.any([
        options.signal ?? new AbortController().signal,
        AbortSignal.timeout(15000),
      ]),
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError('No pudimos conectar con el sistema. Puedes volver a intentarlo.', 0)
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as {
      detail?: string
      fields?: Record<string, string>
      errors?: { field: string; message: string }[]
    }
    if (response.status === 401 && !path.includes('/auth/'))
      window.dispatchEvent(new Event('session-expired'))
    throw new ApiError(
      problem.detail ?? 'No pudimos completar la operación.',
      response.status,
      response.headers.get('X-Request-ID') ?? undefined,
      problem.fields ?? Object.fromEntries(problem.errors?.map((e) => [e.field, e.message]) ?? []),
    )
  }
  return response
}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchResponse(path, options)
  const content = await response.text()
  return content ? (JSON.parse(content) as T) : (undefined as T)
}
export function getJson<T>(path: string, signal: AbortSignal) {
  return request<T>(path, { signal })
}
export function saveJson<T>(path: string, body: unknown, method = 'POST') {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No pudimos completar la operación.'
}

export async function requestBlob(path: string, signal: AbortSignal) {
  const response = await fetchResponse(path, { signal, headers: { Accept: 'image/png' } })
  return {
    blob: await response.blob(),
    pages: Number(response.headers.get('X-Document-Pages') ?? 1),
  }
}
