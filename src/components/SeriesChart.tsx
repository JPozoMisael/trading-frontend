import {
  BaselineSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { fmtDateTime, fmtDay } from '../lib/format'

export interface SeriesPoint {
  time: number // unix s
  value: number
  detail?: string
}

interface Props {
  kind: 'line' | 'bars'
  points: SeriesPoint[]
  format: (v: number) => string
  /** Título visible; también nombra la serie (una sola: sin leyenda). */
  title: string
  empty: string
  daily?: boolean
  height?: number
}

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

/**
 * Una serie, un eje. La línea usa base 0: encima del cero en verde, debajo en rojo
 * (polaridad), y la lectura al pasar el cursor va en la cabecera, no en cada punto.
 */
export function SeriesChart({ kind, points, format, title, empty, daily, height = 240 }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [hover, setHover] = useState<SeriesPoint | null>(null)
  const last = points.at(-1) ?? null

  useEffect(() => {
    const el = box.current
    if (!el || !points.length) return
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: css('--ink-3'),
        fontFamily: css('--font-cond'),
        fontSize: 11,
        attributionLogo: false, // atribución visible en el gráfico principal
      },
      grid: { vertLines: { visible: false }, horzLines: { color: css('--line') } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: !daily, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: false,
      handleScale: false,
      localization: {
        locale: 'es-EC',
        priceFormatter: format,
        timeFormatter: (t: Time) => (daily ? fmtDay : fmtDateTime)(new Date((t as number) * 1000)),
      },
    })
    chartRef.current = chart
    const up = css('--up')
    const down = css('--down')

    // Tiempos únicos y crecientes (dos cierres en el mismo segundo romperían la serie)
    let prev = -Infinity
    const data = points.map((p) => {
      const t = p.time <= prev ? prev + 1 : p.time
      prev = t
      return { ...p, time: t }
    })
    const byTime = new Map(data.map((d) => [d.time, d]))

    if (kind === 'line') {
      const s = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: 0 },
        topLineColor: up,
        bottomLineColor: down,
        topFillColor1: css('--up-soft'),
        topFillColor2: 'rgba(0,0,0,0)',
        bottomFillColor1: 'rgba(0,0,0,0)',
        bottomFillColor2: css('--down-soft'),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      })
      s.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })))
    } else {
      const s = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false })
      s.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value, color: d.value >= 0 ? up : down })))
    }
    chart.timeScale().fitContent()

    const onMove = (p: MouseEventParams<Time>) => setHover(p.time != null ? (byTime.get(p.time as number) ?? null) : null)
    chart.subscribeCrosshairMove(onMove)
    return () => {
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      chartRef.current = null
    }
  }, [points, kind, format, daily])

  const shown = hover ?? last
  return (
    <figure className="series-chart">
      <figcaption>
        <span className="sc-title">{title}</span>
        {shown && (
          <span className="sc-read">
            <b className={shown.value >= 0 ? 'pos' : 'neg'}>{format(shown.value)}</b>
            <span className="muted">
              {hover ? (daily ? fmtDay : fmtDateTime)(new Date(shown.time * 1000)) : 'último'}
              {shown.detail ? ` · ${shown.detail}` : ''}
            </span>
          </span>
        )}
      </figcaption>
      {points.length ? <div ref={box} style={{ height }} /> : <p className="muted empty">{empty}</p>}
    </figure>
  )
}
