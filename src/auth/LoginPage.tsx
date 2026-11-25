import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(username.trim(), password)
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      setError(
        status === 401
          ? 'Usuario o contraseña incorrectos.'
          : status === 429
            ? 'Demasiados intentos. Espera un minuto y vuelve a probar.'
            : 'No se pudo conectar con la API. Revisa que esté corriendo.',
      )
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={onSubmit} noValidate>
        <svg className="login-mark" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M12 10v28M24 7v34M36 13v22" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" />
          <rect x="9" y="17" width="6" height="11" rx="1.5" fill="none" stroke="var(--up)" strokeWidth="2" />
          <rect x="21" y="14" width="6" height="16" rx="1.5" fill="var(--down)" />
          <rect x="33" y="19" width="6" height="9" rx="1.5" fill="none" stroke="var(--up)" strokeWidth="2" />
          <path d="M4 24h40" stroke="var(--brass)" strokeWidth="2" />
        </svg>
        <h1>Mesa de análisis</h1>
        <p className="muted">El modelo, sus operaciones y el gráfico, en una sola pantalla. Solo lectura.</p>

        <label className="field">
          <span>Usuario</span>
          <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && (
          <p className="status status-critical" role="alert">
            <span aria-hidden="true">✕</span> {error}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy || !username || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
