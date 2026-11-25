import { useAccount, useModelLatest, usePositions } from '../api/hooks'
import type { Evaluation } from '../api/types'
import { explainSide } from '../lib/factors'
import { fmtAgo, fmtDistance, fmtHour, fmtMoney, fmtNum, fmtPrice, pairLabel } from '../lib/format'
import { ProbabilityMeter } from './ProbabilityMeter'

const STALE_MS = 2 * 3600 * 1000 // más de 2 velas H1 sin evaluar = algo pasa

function plan(ev: Evaluation, side: 'long' | 'short', pair: string) {
  if (ev.close == null || ev.atr == null || ev.sl_atr == null || ev.tp_atr == null) return null
  const s = side === 'long' ? 1 : -1
  const sl = ev.close - s * ev.sl_atr * ev.atr
  const tp = ev.close + s * ev.tp_atr * ev.atr
  return { sl, tp, slDist: fmtDistance(ev.close - sl, pair), tpDist: fmtDistance(tp - ev.close, pair) }
}

function SidePlan({ ev, side, pair }: { ev: Evaluation; side: 'long' | 'short'; pair: string }) {
  const p = plan(ev, side, pair)
  const factores = explainSide(ev.factores?.[side])
  return (
    <div className="side-plan">
      <ProbabilityMeter
        label={side === 'long' ? 'Compra' : 'Venta'}
        side={side}
        p={side === 'long' ? ev.p_long : ev.p_short}
        umbral={ev.umbral ?? 0.5}
      />
      {p && (
        <dl className="levels">
          <div>
            <dt>Stop</dt>
            <dd>
              {fmtPrice(p.sl, pair)} <small>{p.slDist}</small>
            </dd>
          </div>
          <div>
            <dt>Objetivo</dt>
            <dd>
              {fmtPrice(p.tp, pair)} <small>{p.tpDist}</small>
            </dd>
          </div>
        </dl>
      )}
      {factores.length > 0 && (
        <ul className="factors" aria-label="Lo que más pesó">
          {factores.map((f) => (
            <li key={f.texto} className={f.aFavor ? 'is-for' : 'is-against'}>
              <span className="factor-dir" aria-label={f.aFavor ? 'la sube' : 'la baja'}>
                {f.aFavor ? '↑' : '↓'}
              </span>
              {f.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ModelPanel({ pair }: { pair: string }) {
  const { data: latest, isLoading } = useModelLatest()
  const item = latest?.find((x) => x.pair === pair)
  const ev = item?.evaluaciones.find((e) => e.p_long != null || e.p_short != null)
  const evaluada = item?.estado?.evaluada
  const stale = evaluada ? Date.now() - new Date(evaluada).getTime() > STALE_MS : false

  return (
    <aside className="panel model-panel" aria-labelledby="mp-title">
      <header className="panel-head">
        <h2 id="mp-title">Lo que ve el modelo</h2>
        {ev && (
          <p className="panel-sub">
            Vela de las {fmtHour(ev.timestamp)} · cierre {fmtPrice(ev.close, pair)}
          </p>
        )}
      </header>

      {isLoading && <p className="muted">Cargando…</p>}
      {!isLoading && !ev && (
        <p className="muted">
          Aún no hay evaluaciones de {pairLabel(pair)}. El strategy-engine guarda una por cada vela cerrada.
        </p>
      )}
      {stale && (
        <p className="status status-warning" role="alert">
          <span aria-hidden="true">⚠</span> Sin evaluar desde {fmtAgo(evaluada)}. Revisa que el strategy-engine siga corriendo.
        </p>
      )}

      {ev && (
        <>
          <SidePlan ev={ev} side="long" pair={pair} />
          <SidePlan ev={ev} side="short" pair={pair} />
          <p className="footnote">
            El modelo no mira noticias, soportes dibujados ni otros mercados. Sus probabilidades aún no separan bien las horas
            buenas de las malas (P16).
          </p>
        </>
      )}
    </aside>
  )
}

export function AccountStrip() {
  const { data: a } = useAccount()
  const { data: positions } = usePositions()
  if (!a) {
    return (
      <div className="panel account">
        <p className="muted">Sin datos de cuenta. El execution-engine los publica cada 5 s.</p>
      </div>
    )
  }
  const hoy = a.day_start_equity != null ? a.equity - a.day_start_equity : null
  return (
    <div className="panel account">
      <div className="account-head">
        <span className={`mode-badge ${a.is_real_account ? 'is-real' : ''}`}>
          {a.is_real_account ? 'Cuenta REAL' : a.source === 'mt5' ? 'MT5 demo' : 'Simulación'}
        </span>
        <span className="muted small">{fmtAgo(a.timestamp)}</span>
      </div>
      <dl className="account-nums">
        <div>
          <dt>Balance</dt>
          <dd>{fmtMoney(a.balance)}</dd>
        </div>
        <div>
          <dt>Equity</dt>
          <dd>{fmtMoney(a.equity)}</dd>
        </div>
        <div>
          <dt>Hoy</dt>
          <dd className={hoy == null ? '' : hoy >= 0 ? 'pos' : 'neg'}>{fmtMoney(hoy, true)}</dd>
        </div>
      </dl>
      <h3 className="mini-title">Posiciones abiertas</h3>
      {!positions?.length ? (
        <p className="muted small">Ninguna.</p>
      ) : (
        <ul className="positions">
          {positions.map((p) => (
            <li key={p.order_id}>
              <span className={p.direction === 'buy' ? 'tag-buy' : 'tag-sell'}>{p.direction === 'buy' ? 'Compra' : 'Venta'}</span>
              <b>{pairLabel(p.pair)}</b>
              <span className="muted small">
                {p.lateral ? 'práctica' : 'modelo'} · {fmtNum(p.volume_lots, 2)} lotes · {fmtAgo(p.opened_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
