export class ApiError extends Error {
  readonly status: number
  readonly requestId?: string
  constructor(message: string, status: number, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
  }
}

export async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new ApiError(
      'No pudimos conectar con el sistema. Puedes volver a intentarlo.',
      response.status,
      response.headers.get('X-Request-Id') ?? undefined,
    )
  }
  return response.json() as Promise<T>
}
