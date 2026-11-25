import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, qs } from './client'
import type {
  Account,
  Candle,
  ChartTrade,
  DailyPnl,
  EquityPoint,
  Evaluation,
  Group,
  Meta,
  Mode,
  ModelLatest,
  Page,
  PairPerf,
  Position,
  Summary,
  Trade,
} from './types'

/*
 * Los datos cambian como mucho una vez por hora (velas H1) salvo cuenta y posiciones.
 * El canal en vivo invalida estas consultas cuando llega algo nuevo, así que el
 * refresco periódico es solo un respaldo.
 */

export const useMeta = () =>
  useQuery({ queryKey: ['meta'], queryFn: () => api.get<Meta>('/meta'), staleTime: Infinity })

export const useAccount = () =>
  useQuery({ queryKey: ['account'], queryFn: () => api.get<Account | null>('/account'), refetchInterval: 30_000 })

export const usePositions = () =>
  useQuery({ queryKey: ['positions'], queryFn: () => api.get<Position[]>('/positions'), refetchInterval: 60_000 })

export const useChart = (pair: string, granularity: string, limit = 600) =>
  useQuery({
    queryKey: ['chart', pair, granularity, limit],
    queryFn: () =>
      api.get<{ candles: Candle[]; trades: ChartTrade[] }>(`/chart${qs({ pair, granularity, limit })}`),
    enabled: !!pair,
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  })

export const useModelLatest = () =>
  useQuery({
    queryKey: ['model', 'latest'],
    queryFn: () => api.get<ModelLatest[]>('/model/latest'),
    refetchInterval: 5 * 60_000,
  })

export const useEvaluations = (pair: string, limit = 72) =>
  useQuery({
    queryKey: ['model', 'evaluations', pair, limit],
    queryFn: () => api.get<Evaluation[]>(`/model/evaluations${qs({ pair, limit })}`),
    enabled: !!pair,
    placeholderData: keepPreviousData,
  })

export const useTrades = (p: { group: Group; mode: Mode; pair?: string; limit: number; offset: number }) =>
  useQuery({
    queryKey: ['trades', p],
    queryFn: () => api.get<Page<Trade>>(`/trades${qs(p)}`),
    placeholderData: keepPreviousData,
  })

export const usePerformance = (group: Group, mode: Mode) =>
  useQuery({
    queryKey: ['performance', group, mode],
    queryFn: () => api.get<{ resumen: Summary; porPar: PairPerf[] }>(`/performance${qs({ group, mode })}`),
  })

export const useEquity = (group: Group, mode: Mode) =>
  useQuery({
    queryKey: ['equity', group, mode],
    queryFn: () => api.get<EquityPoint[]>(`/equity${qs({ group, mode })}`),
  })

export const useDailyPnl = (group: Group, mode: Mode, days = 90) =>
  useQuery({
    queryKey: ['daily-pnl', group, mode, days],
    queryFn: () => api.get<DailyPnl[]>(`/daily-pnl${qs({ group, mode, days })}`),
  })
