/** Llamadas a la API. Misma origen (proxy), así que la cookie de sesión viaja sola. */

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Avisa a la app cuando la sesión venció, para volver al login. */
export const sessionExpired = new EventTarget()

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    sessionExpired.dispatchEvent(new Event('expired'))
  }
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (body.message) msg = Array.isArray(body.message) ? body.message.join(' · ') : body.message
    } catch {
      /* sin cuerpo JSON */
    }
    throw new ApiError(res.status, msg)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
}
