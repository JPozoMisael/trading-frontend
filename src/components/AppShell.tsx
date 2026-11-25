import { useEffect, useState } from 'react'
import { NavLink, Outlet, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { useLive } from '../live/LiveProvider'

type Theme = 'dark' | 'light'

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('mesa:tema')
    if (t === 'dark' || t === 'light') return t
  } catch {
    /* sin almacenamiento */
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function AppShell() {
  const { username, logout } = useAuth()
  const { notices, dismiss } = useLive()
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [params] = useSearchParams()
  const par = params.get('par')
  const keep = par ? `?par=${par}` : ''

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('mesa:tema', theme)
    } catch {
      /* sin almacenamiento */
    }
  }, [theme])

  return (
    <div className="shell">
      <a className="skip" href="#contenido">
        Ir al contenido
      </a>
      <header className="topbar">
        <span className="brand">Mesa de análisis</span>
        <nav className="nav" aria-label="Secciones">
          <NavLink to={`/${keep}`} end>
            Gráfico
          </NavLink>
          <NavLink to={`/modelo${keep}`}>Hora por hora</NavLink>
          <NavLink to="/operaciones">Operaciones</NavLink>
          <NavLink to="/rendimiento">Rendimiento</NavLink>
        </nav>
        <div className="topbar-end">
          <span className="ro-badge" title="Este panel no puede enviar órdenes ni cambiar nada del sistema">
            Solo lectura
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <span className="muted small user">{username}</span>
          <button type="button" className="btn btn-quiet" onClick={() => void logout()}>
            Salir
          </button>
        </div>
      </header>

      <main id="contenido" className="content">
        <Outlet />
      </main>

      <div className="toasts" aria-live="polite">
        {notices.map((n) => (
          <div key={n.id} className={`toast toast-${n.kind.replace(':', '-')}`}>
            <span>{n.text}</span>
            <button type="button" className="icon-btn" aria-label="Cerrar aviso" onClick={() => dismiss(n.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
