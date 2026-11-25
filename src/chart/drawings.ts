/**
 * Herramientas de dibujo sobre lightweight-charts (primitiva de serie propia).
 *
 * Los puntos se guardan como {time (unix s), price}. Para convertirlos a píxeles se
 * pasa por el índice lógico de la vela, así un punto dibujado a la derecha de la
 * última vela (en el futuro) también se ubica bien.
 */
import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts'
import type { CanvasRenderingTarget2D } from 'fancy-canvas'

export type Tool = 'cursor' | 'trend' | 'hline' | 'rect' | 'fib' | 'measure'
export type DrawingKind = 'trend' | 'hline' | 'rect' | 'fib'

export interface Pt {
  time: number
  price: number
}

export interface Drawing {
  id: string
  kind: DrawingKind
  a: Pt
  b?: Pt
}

/** Cuántos clics necesita cada herramienta. */
export const POINTS: Record<Exclude<Tool, 'cursor'>, 1 | 2> = {
  trend: 2,
  hline: 1,
  rect: 2,
  fib: 2,
  measure: 2,
}

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

export interface DrawTheme {
  draw: string
  select: string
  up: string
  down: string
  upSoft: string
  downSoft: string
  ink: string
  font: string
}

/** Formato de precio y distancia, depende del instrumento. */
export interface PriceFmt {
  price: (v: number) => string
  pips: (diff: number) => string
}

// ---------------------------------------------------------------- mapeo tiempo <-> eje

export class TimeMapper {
  private times: number[] = []
  private barSec = 3600

  setTimes(times: number[]) {
    this.times = times
    if (times.length >= 2) {
      // Paso típico: la mediana evita que un fin de semana lo distorsione
      const diffs = times.slice(1).map((t, i) => t - times[i]).sort((x, y) => x - y)
      this.barSec = diffs[Math.floor(diffs.length / 2)] || 3600
    }
  }

  get length() {
    return this.times.length
  }

  /** Índice lógico (puede ser fraccional, negativo o mayor que la última vela). */
  toLogical(t: number): number | null {
    const ts = this.times
    const n = ts.length
    if (!n) return null
    if (t >= ts[n - 1]) return n - 1 + (t - ts[n - 1]) / this.barSec
    if (t <= ts[0]) return (t - ts[0]) / this.barSec
    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (ts[mid] <= t) lo = mid
      else hi = mid
    }
    return lo + (t - ts[lo]) / (ts[hi] - ts[lo])
  }

  fromLogical(l: number): number | null {
    const ts = this.times
    const n = ts.length
    if (!n) return null
    const i = Math.round(l)
    if (i >= n) return ts[n - 1] + (i - (n - 1)) * this.barSec
    if (i < 0) return ts[0] + i * this.barSec
    return ts[i]
  }

  /** Vela que contiene el instante t (para marcadores). */
  barAt(t: number): number | null {
    const l = this.toLogical(t)
    if (l == null || l < 0) return null
    const i = Math.min(Math.floor(l), this.times.length - 1)
    return this.times[i]
  }
}

// ---------------------------------------------------------------- primitiva

interface State {
  drawings: Drawing[]
  preview: Drawing | null
  measure: { a: Pt; b: Pt } | null
  selected: string | null
}

type XY = { x: number; y: number }

class Renderer implements IPrimitivePaneRenderer {
  private readonly src: DrawingsPrimitive
  constructor(src: DrawingsPrimitive) {
    this.src = src
  }

  draw(target: CanvasRenderingTarget2D) {
    const src = this.src
    const series = src.series
    if (!src.chart || !series) return
    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr, bitmapSize }) => {
      const t = src.theme
      const toPx = (p: Pt): XY | null => {
        const xy = src.toXY(p)
        return xy ? { x: xy.x * hr, y: xy.y * vr } : null
      }
      ctx.save()
      ctx.font = `${12 * vr}px ${t.font}`
      ctx.textBaseline = 'middle'

      const all = [...src.state.drawings]
      if (src.state.preview) all.push(src.state.preview)

      for (const d of all) {
        const sel = d.id === src.state.selected
        const color = sel ? t.select : t.draw
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = (sel ? 2 : 1.5) * hr
        ctx.setLineDash(d.id === 'preview' ? [5 * hr, 4 * hr] : [])
        const a = toPx(d.a)
        if (!a) continue

        if (d.kind === 'hline') {
          line(ctx, 0, a.y, bitmapSize.width, a.y)
          label(ctx, src.fmt.price(d.a.price), bitmapSize.width - 6 * hr, a.y - 9 * vr, color, 'right')
          continue
        }
        const b = d.b ? toPx(d.b) : null
        if (!b) continue

        if (d.kind === 'trend') {
          line(ctx, a.x, a.y, b.x, b.y)
          dot(ctx, a, 3 * hr)
          dot(ctx, b, 3 * hr)
        } else if (d.kind === 'rect') {
          ctx.globalAlpha = 0.12
          ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
          ctx.globalAlpha = 1
          ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
        } else if (d.kind === 'fib') {
          // 0 en el punto final (b), 1 en el inicio (a): el retroceso se mide desde el extremo
          const x0 = Math.min(a.x, b.x)
          const x1 = Math.max(a.x, b.x, x0 + 40 * hr)
          for (const lv of FIB_LEVELS) {
            const price = d.b!.price + (d.a.price - d.b!.price) * lv
            const y = series.priceToCoordinate(price)
            if (y == null) continue
            const py = y * vr
            ctx.globalAlpha = lv === 0.5 || lv === 0.618 ? 1 : 0.6
            line(ctx, x0, py, x1, py)
            ctx.globalAlpha = 1
            label(ctx, `${lv} · ${src.fmt.price(price)}`, x0 + 4 * hr, py - 8 * vr, color, 'left')
          }
          ctx.globalAlpha = 0.35
          line(ctx, a.x, a.y, b.x, b.y)
          ctx.globalAlpha = 1
        }
      }

      // Regla de medición
      const m = src.state.measure
      if (m) {
        const a = toPx(m.a)
        const b = toPx(m.b)
        if (a && b) {
          const subida = m.b.price >= m.a.price
          ctx.setLineDash([])
          ctx.fillStyle = subida ? t.upSoft : t.downSoft
          ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
          ctx.strokeStyle = subida ? t.up : t.down
          ctx.lineWidth = 1.5 * hr
          line(ctx, a.x, a.y, b.x, b.y)
          const la = src.mapper.toLogical(m.a.time) ?? 0
          const lb = src.mapper.toLogical(m.b.time) ?? 0
          const velas = Math.round(Math.abs(lb - la))
          const diff = m.b.price - m.a.price
          const pct = (diff / m.a.price) * 100
          const txt = `${src.fmt.pips(diff)} · ${pct >= 0 ? '+' : '−'}${Math.abs(pct).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} % · ${velas} velas`
          const w = ctx.measureText(txt).width + 14 * hr
          const bx = (a.x + b.x) / 2 - w / 2
          const by = (subida ? Math.min(a.y, b.y) - 26 * vr : Math.max(a.y, b.y) + 6 * vr)
          ctx.fillStyle = subida ? t.up : t.down
          roundRect(ctx, bx, by, w, 20 * vr, 4 * hr)
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.fillText(txt, bx + w / 2, by + 10 * vr)
        }
      }
      ctx.restore()
    })
  }
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}
function dot(ctx: CanvasRenderingContext2D, p: XY, r: number) {
  ctx.beginPath()
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.fill()
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}
function label(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, color: string, align: CanvasTextAlign) {
  ctx.textAlign = align
  ctx.fillStyle = color
  ctx.fillText(txt, x, y)
}

class PaneView implements IPrimitivePaneView {
  private readonly r: Renderer
  constructor(src: DrawingsPrimitive) {
    this.r = new Renderer(src)
  }
  zOrder() {
    return 'top' as const
  }
  renderer() {
    return this.r
  }
}

export class DrawingsPrimitive implements ISeriesPrimitive<Time> {
  chart: IChartApi | null = null
  series: ISeriesApi<SeriesType> | null = null
  private requestUpdate: (() => void) | null = null
  private readonly views: PaneView[]
  readonly state: State = { drawings: [], preview: null, measure: null, selected: null }

  readonly mapper: TimeMapper
  theme: DrawTheme
  fmt: PriceFmt

  constructor(mapper: TimeMapper, theme: DrawTheme, fmt: PriceFmt) {
    this.mapper = mapper
    this.theme = theme
    this.fmt = fmt
    this.views = [new PaneView(this)]
  }

  attached(p: SeriesAttachedParameter<Time>) {
    this.chart = p.chart as IChartApi
    this.series = p.series
    this.requestUpdate = p.requestUpdate
  }
  detached() {
    this.chart = null
    this.series = null
    this.requestUpdate = null
  }
  paneViews() {
    return this.views
  }
  update() {
    this.requestUpdate?.()
  }

  toXY(p: Pt): XY | null {
    if (!this.chart || !this.series) return null
    const l = this.mapper.toLogical(p.time)
    if (l == null) return null
    const x = this.chart.timeScale().logicalToCoordinate(l as Logical)
    const y = this.series.priceToCoordinate(p.price)
    return x == null || y == null ? null : { x, y }
  }

  /** Id del dibujo bajo el punto (px del gráfico), con 6 px de tolerancia. */
  findAt(x: number, y: number): string | null {
    const tol = 6
    for (const d of [...this.state.drawings].reverse()) {
      const a = this.toXY(d.a)
      if (!a) continue
      if (d.kind === 'hline') {
        if (Math.abs(y - a.y) <= tol) return d.id
        continue
      }
      const b = d.b ? this.toXY(d.b) : null
      if (!b) continue
      if (d.kind === 'trend' && distToSegment({ x, y }, a, b) <= tol) return d.id
      if (d.kind === 'rect' || d.kind === 'fib') {
        const inX = x >= Math.min(a.x, b.x) - tol && x <= Math.max(a.x, b.x, Math.min(a.x, b.x) + 40) + tol
        const inY = y >= Math.min(a.y, b.y) - tol && y <= Math.max(a.y, b.y) + tol
        if (inX && inY) return d.id
      }
    }
    return null
  }
}

function distToSegment(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

// ---------------------------------------------------------------- guardado local

const key = (pair: string) => `mesa:dibujos:${pair}`

export function loadDrawings(pair: string): Drawing[] {
  try {
    const raw = localStorage.getItem(key(pair))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Drawing[]).filter((d) => d && d.kind && d.a) : []
  } catch {
    return []
  }
}

export function saveDrawings(pair: string, drawings: Drawing[]) {
  try {
    localStorage.setItem(key(pair), JSON.stringify(drawings))
  } catch {
    /* sin almacenamiento (modo privado): los dibujos duran hasta recargar */
  }
}
