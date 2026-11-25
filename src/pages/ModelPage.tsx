import { useEvaluations } from '../api/hooks'
import type { Evaluation } from '../api/types'
import { PairTabs, usePair } from '../components/PairTabs'
import { explainSide } from '../lib/factors'
import { fmtDateTime, fmtPct, fmtPrice, pairLabel } from '../lib/format'

function Prob({ p, umbral, side }: { p: number | null; umbral: number; side: 'long' | 'short' }) {
  return (
    <span className={`cell-prob cell-prob-${side}`}>
      <span className="cell-bar" aria-hidden="true">
        <i style={{ width: `${Math.min(100, (p ?? 0) * 100)}%` }} />
        <b style={{ left: `${umbral * 100}%` }} />
      </span>
      {fmtPct(p)}
    </span>
  )
}

/** El dato que más pesó en el lado más probable. */
function topFactor(e: Evaluation): string {
  const side = (e.p_long ?? 0) >= (e.p_short ?? 0) ? 'long' : 'short'
  const f = explainSide(e.factores?.[side])[0]
  if (!f) return '—'
  return `${f.aFavor ? '↑' : '↓'} ${f.texto}`
}

export function ModelPage() {
  const [pair, setPair, pairs] = usePair()
  const { data, isLoading } = useEvaluations(pair, 96)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Hora por hora</h1>
        <PairTabs pair={pair} pairs={pairs} onChange={setPair} />
      </header>
      <p className="lede">
        Lo que el modelo vio en cada vela de {pairLabel(pair)}, opere o no. Opera solo cuando la compra o la venta cruza el
        umbral (la marca de latón).
      </p>

      <section className="panel table-wrap">
        {isLoading ? (
          <p className="muted">Cargando…</p>
        ) : !data?.length ? (
          <p className="muted empty">Sin evaluaciones guardadas para {pairLabel(pair)} todavía.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Vela</th>
                <th scope="col" className="num">Cierre</th>
                <th scope="col">Compra</th>
                <th scope="col">Venta</th>
                <th scope="col">Señal</th>
                <th scope="col">Lo que más pesó</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={`${e.timestamp}-${e.strategy_name}`} className={e.senal ? 'row-signal' : ''}>
                  <td>{fmtDateTime(e.timestamp)}</td>
                  <td className="num">{fmtPrice(e.close, pair)}</td>
                  <td>
                    <Prob p={e.p_long} umbral={e.umbral ?? 0.5} side="long" />
                  </td>
                  <td>
                    <Prob p={e.p_short} umbral={e.umbral ?? 0.5} side="short" />
                  </td>
                  <td>
                    {e.senal ? (
                      <span className={e.senal === 'buy' ? 'tag-buy' : 'tag-sell'}>{e.senal === 'buy' ? 'Compra' : 'Venta'}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="factor-cell">{topFactor(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
