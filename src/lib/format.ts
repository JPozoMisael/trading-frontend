/** Formatos de números y fechas. Hora de Ecuador, como los reportes del sistema. */

export const TZ = 'America/Guayaquil'

/** Decimales de precio por instrumento (igual que el broker). */
export function priceDigits(pair: string): number {
  if (pair.startsWith('XAU')) return 2
  if (pair.includes('JPY')) return 3
  return 5
}

/** Tamaño de pip: 0.0001, 0.01 en JPY, 0.1 USD en oro (como shared/fx.py). */
export function pipSize(pair: string): number {
  if (pair.startsWith('XAU')) return 0.1
  if (pair.includes('JPY')) return 0.01
  return 0.0001
}

export function pairLabel(pair: string): string {
  return pair.replace('_', '/')
}

export function fmtPrice(v: number | null | undefined, pair: string): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('es-EC', {
    minimumFractionDigits: priceDigits(pair),
    maximumFractionDigits: priceDigits(pair),
  })
}

export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('es-EC', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtMoney(v: number | null | undefined, signed = false): string {
  if (v == null || Number.isNaN(v)) return '—'
  const s = Math.abs(v).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sign = v < 0 ? '−' : signed && v > 0 ? '+' : ''
  return `${sign}$${s}`
}

export function fmtR(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—'
  const sign = v < 0 ? '−' : v > 0 ? '+' : ''
  return `${sign}${fmtNum(Math.abs(v), 2)} R`
}

export function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${fmtNum(v * 100, digits)} %`
}

const dtFmt = new Intl.DateTimeFormat('es-EC', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const hourFmt = new Intl.DateTimeFormat('es-EC', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
const dayFmt = new Intl.DateTimeFormat('es-EC', { timeZone: TZ, day: '2-digit', month: 'short' })

export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return '—'
  return dtFmt.format(new Date(v))
}
export function fmtHour(v: string | Date | null | undefined): string {
  if (!v) return '—'
  return hourFmt.format(new Date(v))
}
export function fmtDay(v: string | Date | null | undefined): string {
  if (!v) return '—'
  return dayFmt.format(new Date(v))
}

/** "hace 3 min", "hace 2 h": para saber si un dato está fresco. */
export function fmtAgo(v: string | Date | null | undefined, now = Date.now()): string {
  if (!v) return '—'
  const s = Math.max(0, Math.round((now - new Date(v).getTime()) / 1000))
  if (s < 60) return `hace ${s} s`
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`
  return `hace ${Math.round(s / 86400)} d`
}

export function fmtDuration(from: string | null, to: string | null): string {
  if (!from || !to) return '—'
  const min = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000)
  if (min < 60) return `${min} min`
  if (min < 1440) return min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`
  return `${Math.floor(min / 1440)} d ${Math.floor((min % 1440) / 60)} h`
}

/** Distancia de precio como la dicen los reportes: pips en divisas, USD/oz en el oro. */
export function fmtDistance(diff: number, pair: string, signed = false): string {
  const sign = signed ? (diff >= 0 ? '+' : '−') : ''
  if (pair.startsWith('XAU')) return `${sign}$${fmtNum(Math.abs(diff), 2)}`
  return `${sign}${fmtNum(Math.abs(diff) / pipSize(pair), 1)} pips`
}

/** Unix (segundos) que usa lightweight-charts. */
export function toUnix(v: string | Date): number {
  return Math.floor(new Date(v).getTime() / 1000)
}
