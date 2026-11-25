import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, sessionExpired } from '../api/client'

type Status = 'cargando' | 'dentro' | 'fuera'

interface AuthCtx {
  status: Status
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('cargando')
  const [username, setUsername] = useState<string | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    api
      .get<{ username: string }>('/auth/me')
      .then((u) => {
        setUsername(u.username)
        setStatus('dentro')
      })
      .catch(() => setStatus('fuera'))

    const onExpired = () => {
      setStatus('fuera')
      qc.clear()
    }
    sessionExpired.addEventListener('expired', onExpired)
    return () => sessionExpired.removeEventListener('expired', onExpired)
  }, [qc])

  const login = useCallback(async (u: string, p: string) => {
    const r = await api.post<{ username: string }>('/auth/login', { username: u, password: p })
    setUsername(r.username)
    setStatus('dentro')
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined)
    qc.clear()
    setUsername(null)
    setStatus('fuera')
  }, [qc])

  return <Ctx.Provider value={{ status, username, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fuera de AuthProvider')
  return c
}
