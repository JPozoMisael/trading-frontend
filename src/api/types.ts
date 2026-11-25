/** Lo que devuelve trading-dashboard-api. Fechas en ISO (UTC). */

export type Group = 'modelo' | 'practica' | 'prueba' | 'todos'
export type Mode = 'sim' | 'mt5'
export type Direction = 'buy' | 'sell'

export interface Meta {
  pairs: string[]
  granularity: string
  timezone: string
  sideStrategies: string[]
}

export interface Account {
  balance: number
  equity: number
  day_start_equity?: number | null
  source: string
  is_real_account: boolean
  unrealized_pnl: number
  realized_pnl: number
  margin_used: number
  open_positions_count: number
  currency: string
  timestamp: string
}

export interface Position {
  order_id: number
  pair: string
  direction: Direction
  execution_mode: Mode
  strategy_name: string | null
  volume_lots: number | null
  entry_price: number | null
  stop_loss: number | null
  take_profit: number | null
  risk_amount: number | null
  opened_at: string
  minutes_open: number
  lateral: boolean
}

export interface Trade {
  id: number
  pair: string
  direction: Direction
  strategy_name: string | null
  execution_mode: Mode
  volume_lots: number | null
  entry_price: number | null
  stop_loss: number | null
  take_profit: number | null
  exit_price: number | null
  exit_reason: string | null
  pnl: number | null
  r_multiple: number | null
  risk_amount: number | null
  opened_at: string | null
  closed_at: string | null
  confidence: number | null
}

export interface Page<T> {
  total: number
  rows: T[]
}

export interface Summary {
  trades: number
  ganadas: number
  perdidas: number
  acierto_pct: number | null
  pnl_total: number | null
  r_promedio: number | null
  r_total: number | null
  profit_factor: number | null
}

export interface PairPerf {
  pair: string
  trades: number
  acierto_pct: number | null
  pnl_total: number | null
  r_promedio: number | null
}

export interface EquityPoint {
  order_id: number
  closed_at: string
  pair: string
  strategy_name: string | null
  pnl: number | null
  r_multiple: number | null
  pnl_acumulado: number
  r_acumulado: number
}

export interface DailyPnl {
  dia: string
  trades: number
  pnl: number | null
  r: number | null
}

export interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ChartTrade {
  id: number
  direction: Direction
  strategy_name: string | null
  status: 'filled' | 'closed'
  execution_mode: Mode
  entry_price: number | null
  stop_loss: number | null
  take_profit: number | null
  exit_price: number | null
  exit_reason: string | null
  pnl: number | null
  r_multiple: number | null
  opened_at: string
  closed_at: string | null
  lateral: boolean
}

export interface Factor {
  dato: string
  valor: number | null
  aporte: number
}

export interface Evaluation {
  pair: string
  granularity: string
  timestamp: string
  strategy_name: string
  p_long: number | null
  p_short: number | null
  umbral: number | null
  close: number | null
  atr: number | null
  sl_atr: number | null
  tp_atr: number | null
  horizonte_velas: number | null
  senal: Direction | null
  factores: { long?: Factor[]; short?: Factor[] } | null
}

export interface StrategyHeartbeat {
  vela: string
  evaluada: string
  estrategias: Record<string, unknown>
}

export interface ModelLatest {
  pair: string
  estado: StrategyHeartbeat | null
  evaluaciones: Evaluation[]
}
