import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  LineSeries,
  LineStyle,
  TickMarkType,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Logical,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChart } from '../api/hooks'
import type { Candle, ChartTrade } from '../api/types'
import { fmtDateTime, fmtDistance, fmtNum, fmtPrice, fmtR, pairLabel, priceDigits, toUnix, TZ } from '../lib/format'
import { useLive } from '../live/LiveProvider'
import {
  DrawingsPrimitive,
  loadDrawings,
  POINTS,
  saveDrawings,
  TimeMapper,
  type Drawing,
  type DrawTheme,
  type Pt,
  type Tool,
} from './drawings'
import { ema } from './indicators'
import { TOOL_KEYS, ToolRail } from './ToolRail'

const RANGES: { id: string; label: string; bars: number | null }[] = [
  { id: '1D', label: '1 día', bars: 24 },
  { id: '5D', label: '5 días', bars: 120 },
  { id: '1M', label: '1 mes', bars: 528 },
  { id: '3M', label: '3 meses', bars: 1580 },
  { id: 'all', label: 'Todo', bars: null },
]

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function readTheme() {
  return {
    surface: cssVar('--surface'),
    line: cssVar('--line'),
    ink: cssVar('--ink'),
    ink2: cssVar('--ink-2'),
    ink3: cssVar('--ink-3'),
    up: cssVar('--up'),
    down: cssVar('--down'),
    upSoft: cssVar('--up-soft'),
    downSoft: cssVar('--down-soft'),
    emaFast: cssVar('--ema-fast'),
    emaSlow: cssVar('--ema-slow'),
    draw: cssVar('--draw'),
    brass: cssVar('--brass'),
    font: cssVar('--font-cond') || 'sans-serif',
  }
}
type Theme = ReturnType<typeof readTheme>

const drawTheme = (t: Theme): DrawTheme => ({
  draw: t.draw,
  select: t.brass,
  up: t.up,
  down: t.down,
  upSoft: t.upSoft,
  downSoft: t.downSoft,
  ink: t.ink,
  font: t.font,
})

const tzParts = (unix: number, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-EC', { timeZone: TZ, hour12: false, ...opts }).format(new Date(unix * 1000))

interface Legend {
  time: number
  open: number
  high: number
  low: number
  close: number
  prevClose: number | null
  ema50: number | null
  ema200: number | null
}

interface Props {
  pair: string
  granularity: string
}

export function ChartWorkspace({ pair, granularity }: Props) {
  const { data, isLoading, error } = useChart(pair, granularity, 2000)
  const live = useLive()

  const box = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const ema200Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const primRef = useRef<DrawingsPrimitive | null>(null)
  const linesRef = useRef<IPriceLine[]>([])
  const mapper = useRef(new TimeMapper()).current
  const candlesRef = useRef<Candle[]>([])
  const fittedFor = useRef<string | null>(null)

  const [tool, setTool] = useState<Tool>('cursor')
  const [magnet, setMagnet] = useState(true)
  const [hidden, setHidden] = useState(false)
  const [drawings, setDrawings] = useState<Drawing[]>(() => loadDrawings(pair))
  const [selected, setSelected] = useState<string | null>(null)
  const [legend, setLegend] = useState<Legend | null>(null)
  const [range, setRange] = useState('5D')
  const [showEma, setShowEma] = useState({ e50: true, e200: true })
  const [showTrades, setShowTrades] = useState(true)

  // Estado que leen los manejadores del gráfico (suscritos una sola vez)
  const toolRef = useRef(tool)
  const magnetRef = useRef(magnet)
  const pending = useRef<Pt | null>(null)
  const emaVals = useRef<{ e50: (number | null)[]; e200: (number | null)[] }>({ e50: [], e200: [] })
  toolRef.current = tool
  magnetRef.current = magnet

  const digits = priceDigits(pair)
  const fmt = useMemo(
    () => ({
      price: (v: number) => fmtPrice(v, pair),
      pips: (diff: number) => fmtDistance(diff, pair, true),
    }),
    [pair],
  )

  // ------------------------------------------------------------ crear el gráfico (una vez)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const t = readTheme()
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: t.surface },
        textColor: t.ink3,
        fontFamily: t.font,
        fontSize: 12,
        attributionLogo: true, // atribución exigida por la licencia de lightweight-charts
      },
      grid: { vertLines: { color: t.line }, horzLines: { color: t.line } },
      rightPriceScale: { borderColor: t.line, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: {
        borderColor: t.line,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        tickMarkFormatter: (time: Time, type: TickMarkType) => {
          const u = time as number
          if (type === TickMarkType.Year) return tzParts(u, { year: 'numeric' })
          if (type === TickMarkType.Month) return tzParts(u, { month: 'short' })
          if (type === TickMarkType.DayOfMonth) return tzParts(u, { day: 'numeric', month: 'short' })
          return tzParts(u, { hour: '2-digit', minute: '2-digit' })
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: t.ink3, labelBackgroundColor: t.line },
        horzLine: { color: t.ink3, labelBackgroundColor: t.line },
      },
      localization: { locale: 'es-EC', timeFormatter: (time: Time) => fmtDateTime(new Date((time as number) * 1000)) },
    })
    const candles = chart.addSeries(CandlestickSeries, {
      // Alcistas huecas, bajistas rellenas: se distinguen sin depender del color
      upColor: 'rgba(0,0,0,0)',
      downColor: t.down,
      borderUpColor: t.up,
      borderDownColor: t.down,
      wickUpColor: t.up,
      wickDownColor: t.down,
    })
    const e50 = chart.addSeries(LineSeries, {
      color: t.emaFast,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    const e200 = chart.addSeries(LineSeries, {
      color: t.emaSlow,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    const prim = new DrawingsPrimitive(mapper, drawTheme(t), fmt)
    candles.attachPrimitive(prim)

    chartRef.current = chart
    candleRef.current = candles
    ema50Ref.current = e50
    ema200Ref.current = e200
    markersRef.current = createSeriesMarkers(candles, [])
    primRef.current = prim

    // Cambio de tema: se vuelven a leer los tokens
    const obs = new MutationObserver(() => {
      const n = readTheme()
      chart.applyOptions({
        layout: { background: { type: ColorType.Solid, color: n.surface }, textColor: n.ink3 },
        grid: { vertLines: { color: n.line }, horzLines: { color: n.line } },
        rightPriceScale: { borderColor: n.line },
        timeScale: { borderColor: n.line },
      })
      candles.applyOptions({ downColor: n.down, borderUpColor: n.up, borderDownColor: n.down, wickUpColor: n.up, wickDownColor: n.down })
      e50.applyOptions({ color: n.emaFast })
      e200.applyOptions({ color: n.emaSlow })
      prim.theme = drawTheme(n)
      prim.update()
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      obs.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      primRef.current = null
      linesRef.current = []
    }
    // fmt se actualiza en su propio efecto
  }, [mapper])

  // ------------------------------------------------------------ instrumento
  useEffect(() => {
    candleRef.current?.applyOptions({ priceFormat: { type: 'price', precision: digits, minMove: 10 ** -digits } })
    chartRef.current?.applyOptions({ localization: { priceFormatter: (p: number) => fmtPrice(p, pair) } })
    if (primRef.current) primRef.current.fmt = fmt
    setDrawings(loadDrawings(pair))
    setSelected(null)
    pending.current = null
  }, [pair, digits, fmt])

  const applyRange = useCallback((id: string) => {
    const chart = chartRef.current
    const n = candlesRef.current.length
    if (!chart || !n) return
    const r = RANGES.find((x) => x.id === id)
    if (!r?.bars) chart.timeScale().fitContent()
    else chart.timeScale().setVisibleLogicalRange({ from: (n - 1 - r.bars) as Logical, to: (n - 1 + 8) as Logical })
  }, [])

  // ------------------------------------------------------------ datos
  useEffect(() => {
    const candles = candleRef.current
    const chart = chartRef.current
    if (!candles || !chart || !data) return
    const cs = data.candles
    candlesRef.current = cs
    const times = cs.map((c) => toUnix(c.time))
    mapper.setTimes(times)

    candles.setData(
      cs.map((c, i) => ({ time: times[i] as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })),
    )
    const closes = cs.map((c) => c.close)
    const v50 = ema(closes, 50)
    const v200 = ema(closes, 200)
    emaVals.current = { e50: v50, e200: v200 }
    const line = (vals: (number | null)[]) =>
      vals.map((v, i) => (v == null ? { time: times[i] as UTCTimestamp } : { time: times[i] as UTCTimestamp, value: v }))
    ema50Ref.current?.setData(line(v50))
    ema200Ref.current?.setData(line(v200))

    drawTrades(data.trades)

    if (fittedFor.current !== pair && cs.length) {
      fittedFor.current = pair
      applyRange(range)
    }
    const last = cs.length - 1
    if (last >= 0) setLegend(legendAt(last))
    primRef.current?.update()
  }, [data])

  useEffect(() => {
    if (data) drawTrades(data.trades)
  }, [showTrades])

  useEffect(() => {
    ema50Ref.current?.applyOptions({ visible: showEma.e50 })
    ema200Ref.current?.applyOptions({ visible: showEma.e200 })
  }, [showEma])

  function legendAt(i: number): Legend | null {
    const cs = candlesRef.current
    const c = cs[i]
    if (!c) return null
    return {
      time: toUnix(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      prevClose: cs[i - 1]?.close ?? null,
      ema50: emaVals.current.e50[i] ?? null,
      ema200: emaVals.current.e200[i] ?? null,
    }
  }

  function drawTrades(trades: ChartTrade[]) {
    const candles = candleRef.current
    const markers = markersRef.current
    if (!candles || !markers) return
    for (const l of linesRef.current) candles.removePriceLine(l)
    linesRef.current = []
    if (!showTrades) {
      markers.setMarkers([])
      return
    }
    const t = readTheme()
    const ms: SeriesMarker<Time>[] = []
    for (const tr of trades) {
      const entryBar = mapper.barAt(toUnix(tr.opened_at))
      const quien = tr.lateral ? 'Práctica' : 'Modelo'
      if (entryBar != null) {
        ms.push({
          time: entryBar as UTCTimestamp,
          position: tr.direction === 'buy' ? 'belowBar' : 'aboveBar',
          shape: tr.direction === 'buy' ? 'arrowUp' : 'arrowDown',
          color: tr.direction === 'buy' ? t.up : t.down,
          text: tr.lateral ? 'P' : '',
          id: `in-${tr.id}`,
        })
      }
      if (tr.status === 'closed' && tr.closed_at && tr.exit_price != null) {
        const exitBar = mapper.barAt(toUnix(tr.closed_at))
        if (exitBar != null) {
          ms.push({
            time: exitBar as UTCTimestamp,
            position: 'atPriceMiddle',
            price: tr.exit_price,
            shape: 'circle',
            color: (tr.pnl ?? 0) >= 0 ? t.up : t.down,
            text: fmtR(tr.r_multiple),
            id: `out-${tr.id}`,
          })
        }
      }
      if (tr.status === 'filled') {
        const add = (price: number | null, title: string, color: string, style: LineStyle) => {
          if (price == null) return
          linesRef.current.push(
            candles.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title }),
          )
        }
        add(tr.entry_price, `Entrada ${quien.toLowerCase()}`, t.ink2, LineStyle.Solid)
        add(tr.stop_loss, 'SL', t.down, LineStyle.Dashed)
        add(tr.take_profit, 'TP', t.up, LineStyle.Dashed)
      }
    }
    ms.sort((a, b) => (a.time as number) - (b.time as number))
    markers.setMarkers(ms)
  }


  // ------------------------------------------------------------ dibujos -> primitiva
  useEffect(() => {
    const prim = primRef.current
    if (!prim) return
    prim.state.drawings = hidden ? [] : drawings
    prim.state.selected = selected
    prim.update()
  }, [drawings, hidden, selected])

  const commit = useCallback(
    (next: Drawing[]) => {
      setDrawings(next)
      saveDrawings(pair, next)
    },
    [pair],
  )

  // ------------------------------------------------------------ clic y movimiento
  const pointFrom = useCallback(
    (param: MouseEventParams<Time>): Pt | null => {
      const candles = candleRef.current
      if (!param.point || param.logical == null || !candles) return null
      const time = mapper.fromLogical(param.logical)
      const raw = candles.coordinateToPrice(param.point.y)
      if (time == null || raw == null) return null
      let price: number = raw
      if (magnetRef.current) {
        const c = candlesRef.current[Math.round(param.logical)]
        if (c) {
          const opts = [c.open, c.high, c.low, c.close]
          price = opts.reduce((best, v) => (Math.abs(v - raw) < Math.abs(best - raw) ? v : best), opts[0])
        }
      }
      return { time, price }
    },
    [mapper],
  )

  const drawingsRef = useRef(drawings)
  drawingsRef.current = drawings

  useEffect(() => {
    const chart = chartRef.current
    const prim = primRef.current
    if (!chart || !prim) return

    const onClick = (param: MouseEventParams<Time>) => {
      const tl = toolRef.current
      if (tl === 'cursor') {
        if (prim.state.measure) {
          prim.state.measure = null
          prim.update()
        }
        setSelected(param.point ? prim.findAt(param.point.x, param.point.y) : null)
        return
      }
      const pt = pointFrom(param)
      if (!pt) return

      if (tl === 'measure') {
        if (!pending.current) {
          pending.current = pt
          prim.state.measure = { a: pt, b: pt }
        } else {
          prim.state.measure = { a: pending.current, b: pt }
          pending.current = null
        }
        prim.update()
        return
      }

      const id = crypto.randomUUID()
      if (POINTS[tl] === 1) {
        commit([...drawingsRef.current, { id, kind: tl, a: pt }])
        return
      }
      if (!pending.current) {
        pending.current = pt
        prim.state.preview = { id: 'preview', kind: tl, a: pt, b: pt }
        prim.update()
      } else {
        const a = pending.current
        pending.current = null
        prim.state.preview = null
        commit([...drawingsRef.current, { id, kind: tl, a, b: pt }])
      }
    }

    const onMove = (param: MouseEventParams<Time>) => {
      // Leyenda OHLC de la vela bajo el cursor (o la última)
      const n = candlesRef.current.length
      const i = param.logical != null ? Math.round(param.logical) : n - 1
      const lg = legendAt(i >= 0 && i < n ? i : n - 1)
      if (lg) setLegend(lg)

      if (!pending.current) return
      const pt = pointFrom(param)
      if (!pt) return
      if (toolRef.current === 'measure' && prim.state.measure) {
        prim.state.measure = { a: pending.current, b: pt }
      } else if (prim.state.preview) {
        prim.state.preview = { ...prim.state.preview, b: pt }
      }
      prim.update()
    }

    chart.subscribeClick(onClick)
    chart.subscribeCrosshairMove(onMove)
    return () => {
      chart.unsubscribeClick(onClick)
      chart.unsubscribeCrosshairMove(onMove)
    }
  }, [commit, pointFrom])

  const cancelPending = useCallback(() => {
    pending.current = null
    const prim = primRef.current
    if (prim) {
      prim.state.preview = null
      prim.state.measure = null
      prim.update()
    }
  }, [])

  const chooseTool = useCallback(
    (t: Tool) => {
      cancelPending()
      setSelected(null)
      setTool(t)
    },
    [cancelPending],
  )

  // ------------------------------------------------------------ teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') {
        cancelPending()
        setSelected(null)
        setTool('cursor')
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        commit(drawingsRef.current.filter((d) => d.id !== selected))
        setSelected(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        commit(drawingsRef.current.slice(0, -1))
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && TOOL_KEYS[e.key.toLowerCase()]) {
        chooseTool(TOOL_KEYS[e.key.toLowerCase()])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, commit, cancelPending, chooseTool])

  // ------------------------------------------------------------ vista
  const change = legend && legend.prevClose != null ? legend.close - legend.prevClose : null
  const toolHint: Record<Tool, string> = {
    cursor: 'Clic en un dibujo para seleccionarlo · Supr lo borra',
    trend: 'Clic en el punto inicial y luego en el final',
    hline: 'Clic en el precio del soporte o resistencia',
    rect: 'Clic en una esquina y luego en la opuesta',
    fib: 'Clic en el inicio del impulso y luego en su extremo',
    measure: 'Clic en el punto inicial y luego en el final',
  }

  return (
    <section className="workspace" aria-label={`Gráfico de ${pairLabel(pair)}`}>
      <ToolRail
        tool={tool}
        onTool={chooseTool}
        magnet={magnet}
        onMagnet={() => setMagnet((m) => !m)}
        hidden={hidden}
        onHidden={() => setHidden((h) => !h)}
        canUndo={drawings.length > 0}
        onUndo={() => commit(drawings.slice(0, -1))}
        count={drawings.length}
        onClear={() => {
          if (window.confirm(`¿Borrar los ${drawings.length} dibujos de ${pairLabel(pair)}?`)) commit([])
        }}
      />

      <div className="stage">
        <div className="legend">
          <span className="legend-pair">
            {pairLabel(pair)} <span className="legend-gran">{granularity}</span>
          </span>
          {legend && (
            <span className="ohlc">
              <span>A <b>{fmtPrice(legend.open, pair)}</b></span>
              <span>Máx <b>{fmtPrice(legend.high, pair)}</b></span>
              <span>Mín <b>{fmtPrice(legend.low, pair)}</b></span>
              <span>C <b>{fmtPrice(legend.close, pair)}</b></span>
              {change != null && (
                <span className={change >= 0 ? 'pos' : 'neg'}>
                  {change >= 0 ? '+' : '−'}
                  {fmtPrice(Math.abs(change), pair)} ({fmtNum((change / legend.prevClose!) * 100, 2)} %)
                </span>
              )}
            </span>
          )}
          <span className="legend-toggles">
            <button type="button" className="chip" aria-pressed={showEma.e50} onClick={() => setShowEma((s) => ({ ...s, e50: !s.e50 }))}>
              <i className="swatch" style={{ background: 'var(--ema-fast)' }} />
              EMA 50 {legend?.ema50 != null && <b>{fmtPrice(legend.ema50, pair)}</b>}
            </button>
            <button type="button" className="chip" aria-pressed={showEma.e200} onClick={() => setShowEma((s) => ({ ...s, e200: !s.e200 }))}>
              <i className="swatch thick" style={{ background: 'var(--ema-slow)' }} />
              EMA 200 {legend?.ema200 != null && <b>{fmtPrice(legend.ema200, pair)}</b>}
            </button>
            <button type="button" className="chip" aria-pressed={showTrades} onClick={() => setShowTrades((s) => !s)}>
              Operaciones
            </button>
          </span>
          <span
            className="live"
            data-state={live.status === 'en vivo' ? 'on' : live.status === 'conectando' ? 'wait' : 'off'}
            role="status"
          >
            <i aria-hidden="true" />
            {live.status === 'en vivo' ? 'En vivo' : live.status === 'conectando' ? 'Conectando…' : 'Sin conexión'}
          </span>
        </div>

        <div ref={box} className={`chart ${tool !== 'cursor' ? 'is-drawing' : ''}`} />

        {isLoading && <div className="chart-msg">Cargando velas de {pairLabel(pair)}…</div>}
        {error && <div className="chart-msg is-error">No se pudieron cargar las velas: {(error as Error).message}</div>}
        {data && !data.candles.length && (
          <div className="chart-msg">
            No hay velas {granularity} de {pairLabel(pair)} en la base. El data-collector las guarda al cerrar cada vela.
          </div>
        )}

        <div className="stage-foot">
          <div className="ranges" role="group" aria-label="Rango visible">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                className="range"
                aria-pressed={range === r.id}
                onClick={() => {
                  setRange(r.id)
                  applyRange(r.id)
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="hint">{toolHint[tool]}</span>
          <span className="hint tz">Hora de Ecuador</span>
        </div>
      </div>
    </section>
  )
}
