import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { io } from 'socket.io-client'
import type { Account } from '../api/types'

export type LiveStatus = 'conectando' | 'en vivo' | 'sin conexión'

export interface LiveNotice {
  id: number
  kind: 'signal' | 'order:executed' | 'order:closed' | 'risk:alert'
  pair?: string
  text: string
  at: number
}

interface LiveCtx {
  status: LiveStatus
  notices: LiveNotice[]
  dismiss: (id: number) => void
}

const Ctx = createContext<LiveCtx>({ status: 'conectando', notices: [], dismiss: () => {} })

type Msg = Record<string, unknown>
const dirText = (d: unknown) => (d === 'buy' ? 'Compra' : d === 'sell' ? 'Venta' : String(d ?? ''))
const pairText = (p: unknown) => String(p ?? '').replace('_', '/')

/**
 * Conexión Socket.IO con la API (/live). Cada evento invalida las consultas que
 * afecta, así las pantallas se actualizan solas sin recargar.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('conectando')
  const [notices, setNotices] = useState<LiveNotice[]>([])

  useEffect(() => {
    const socket = io('/live', { path: '/socket.io', withCredentials: true, transports: ['websocket', 'polling'] })
    let seq = 0
    const push = (n: Omit<LiveNotice, 'id' | 'at'>) =>
      setNotices((prev) => [{ ...n, id: ++seq, at: Date.now() }, ...prev].slice(0, 5))

    socket.on('connect', () => setStatus('en vivo'))
    socket.on('disconnect', () => setStatus('sin conexión'))
    socket.on('connect_error', () => setStatus('sin conexión'))

    socket.on('candle', (c: Msg) => {
      void qc.invalidateQueries({ queryKey: ['chart', c.pair] })
    })
    socket.on('strategy', () => {
      void qc.invalidateQueries({ queryKey: ['model'] })
    })
    socket.on('account', (a: Account) => {
      qc.setQueryData(['account'], a)
    })
    socket.on('signal', (s: Msg) => {
      push({
        kind: 'signal',
        pair: String(s.pair),
        text: `Señal: ${dirText(s.direction)} ${pairText(s.pair)} al ${Math.round(Number(s.confidence) * 100)} % (${s.strategy_name})`,
      })
    })
    const onOrder = (kind: 'order:executed' | 'order:closed') => (o: Msg) => {
      void qc.invalidateQueries({ queryKey: ['positions'] })
      void qc.invalidateQueries({ queryKey: ['chart', o.pair] })
      if (kind === 'order:closed') {
        for (const k of ['trades', 'performance', 'equity', 'daily-pnl']) void qc.invalidateQueries({ queryKey: [k] })
      }
      const pnl = typeof o.pnl === 'number' ? ` · ${o.pnl >= 0 ? '+' : '−'}$${Math.abs(o.pnl).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
      push({
        kind,
        pair: String(o.pair),
        text:
          kind === 'order:executed'
            ? `Orden abierta: ${dirText(o.direction)} ${pairText(o.pair)}`
            : `Operación cerrada: ${dirText(o.direction)} ${pairText(o.pair)}${pnl}`,
      })
    }
    socket.on('order:executed', onOrder('order:executed'))
    socket.on('order:closed', onOrder('order:closed'))
    socket.on('risk:alert', (a: Msg) => {
      push({ kind: 'risk:alert', text: `Alerta de riesgo: ${String(a.reason ?? a.message ?? a.type ?? 'ver logs')}` })
    })

    return () => {
      socket.disconnect()
    }
  }, [qc])

  const dismiss = (id: number) => setNotices((n) => n.filter((x) => x.id !== id))
  return <Ctx.Provider value={{ status, notices, dismiss }}>{children}</Ctx.Provider>
}

export const useLive = () => useContext(Ctx)
