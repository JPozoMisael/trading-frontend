/**
 * Los datos que más movieron la probabilidad, en palabras.
 * Misma traducción que el reporte de las 8:00 (_factor_text en
 * services/monitoring/src/daily_report.py del sistema de trading): si cambia allá,
 * cambiar aquí.
 */
import type { Factor } from '../api/types'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

function periodo(n: number, granMinutes: number): string {
  const m = n * granMinutes
  if (m >= 2880 && m % 1440 === 0) return `los últimos ${m / 1440} días`
  if (m % 60 === 0) return m === 60 ? 'la última hora' : `las últimas ${m / 60} horas`
  return `los últimos ${m} minutos`
}

const lado = (x: number) => (x >= 0 ? 'encima' : 'debajo')
const n = (x: number, d: number) => x.toLocaleString('es-EC', { minimumFractionDigits: d, maximumFractionDigits: d })
const f1 = (x: number) => n(Math.abs(x), 1)

export function factorText(dato: string, v: number, granMinutes = 60): string {
  const p = (n: number) => periodo(n, granMinutes)
  if (dato.startsWith('ret_')) {
    const pct = (Math.exp(v) - 1) * 100
    return `En ${p(Number(dato.split('_')[1]))} el precio ${pct >= 0 ? 'subió' : 'bajó'} ${n(Math.abs(pct), 2)} %`
  }
  if (dato.startsWith('dist_ema_')) {
    return `El precio está ${f1(v)} velas típicas ${lado(v)} de la EMA ${dato.split('_').at(-1)}`
  }
  if (dato.startsWith('pendiente_ema_')) {
    return `La EMA ${dato.split('_').at(-1)} ${v >= 0 ? 'subió' : 'bajó'} ${f1(v)} velas típicas en ${p(24)}`
  }
  const textos: Record<string, () => string> = {
    atr_pct: () => `La vela típica mueve el ${n(v * 100, 2)} % del precio (volatilidad)`,
    rsi_14: () => `RSI 14 en ${n(v, 0)}`,
    vol_24: () => `Volatilidad de ${p(24)}: ~${n(v * 100, 2)} % por vela`,
    vol_120: () => `Volatilidad de ${p(120)}: ~${n(v * 100, 2)} % por vela`,
    vol_ratio: () => `La volatilidad de ${p(24)} es ${n(v, 1)} veces la de ${p(120)}`,
    range_atr: () => `La última vela midió ${n(v, 1)} velas típicas de mínimo a máximo`,
    body_atr: () => `La última vela fue ${v >= 0 ? 'alcista' : 'bajista'}, con cuerpo de ${f1(v)} velas típicas`,
    pos_rango_24: () => `El precio está al ${n(v * 100, 0)} % del rango de ${p(24)} (0 % = mínimo, 100 % = máximo)`,
    hora_sin: () => 'La hora del día',
    hora_cos: () => 'La hora del día',
    dia_semana: () => `El día de la semana (${DIAS[Math.trunc(v) % 7]})`,
    dist_max_120: () => `El precio está ${f1(v)} velas típicas debajo del máximo de ${p(120)}`,
    dist_min_120: () => `El precio está ${f1(v)} velas típicas encima del mínimo de ${p(120)}`,
    regimen_atr: () => `La volatilidad está a ${n(v, 1)} veces su promedio`,
    pos_rango_dia_anterior: () => `El precio está al ${n(v * 100, 0)} % del rango de ayer`,
    dist_max_dia_anterior: () => `El precio está ${f1(v)} velas típicas ${lado(v)} del máximo de ayer`,
    dist_min_dia_anterior: () => `El precio está ${f1(v)} velas típicas ${lado(v)} del mínimo de ayer`,
  }
  return textos[dato]?.() ?? dato
}

/** Factores de un lado ya traducidos, sin repetir (hora_sin y hora_cos son el mismo dato). */
export function explainSide(factores: Factor[] | undefined, granMinutes = 60) {
  const vistos = new Set<string>()
  const out: { texto: string; aFavor: boolean; aporte: number }[] = []
  for (const f of factores ?? []) {
    const texto = f.valor == null ? `${f.dato}: sin dato todavía` : factorText(f.dato, f.valor, granMinutes)
    if (vistos.has(texto)) continue
    vistos.add(texto)
    out.push({ texto, aFavor: f.aporte > 0, aporte: f.aporte })
  }
  return out
}
