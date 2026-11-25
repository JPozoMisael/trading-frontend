import { useMemo, useState } from 'react'
import { useDailyPnl, useEquity, usePerformance } from '../api/hooks'
import type { Group, Mode } from '../api/types'
import { Segmented } from '../components/Segmented'
import { SeriesChart, type SeriesPoint } from '../components/SeriesChart'
import { fmtMoney, fmtNum, fmtR, pairLabel, toUnix } from '../lib/format'
import { GROUP_HELP, GROUP_OPTIONS, MODE_OPTIONS } from './filters'

const fmtRAxis = (v: number) => `${v >= 0 ? '' : '−'}${fmtNum(Math.abs(v), 1)} R`
const fmtUsdAxis = (v: number) => fmtMoney(v)

export function PerformancePage() {
  const [group, setGroup] = useState<Group>('modelo')
  const [mode, setMode] = useState<Mode>('sim')
  const { data: perf, isLoading } = usePerformance(group, mode)
  const { data: equity } = useEquity(group, mode)
  const { data: daily } = useDailyPnl(group, mode, 120)

  const eqPoints = useMemo<SeriesPoint[]>(
    () =>
      (equity ?? []).map((e) => ({
        time: toUnix(e.closed_at),
        value: e.r_acumulado,
        detail: `${pairLabel(e.pair)} ${fmtR(e.r_multiple)}`,
      })),
    [equity],
  )
  const dayPoints = useMemo<SeriesPoint[]>(
    () =>
      (daily ?? []).map((d) => ({
        time: toUnix(`${d.dia.slice(0, 10)}T12:00:00Z`),
        value: d.pnl ?? 0,
        detail: `${d.trades} ${d.trades === 1 ? 'operación' : 'operaciones'} · ${fmtR(d.r)}`,
      })),
    [daily],
  )

  const r = perf?.resumen
  return (
    <div className="page">
      <header className="page-head">
        <h1>Rendimiento</h1>
        <div className="filters">
          <Segmented label="Quién operó" value={group} options={GROUP_OPTIONS} onChange={setGroup} />
          <Segmented label="Cuenta" value={mode} options={MODE_OPTIONS} onChange={setMode} />
        </div>
      </header>
      <p className="lede">{GROUP_HELP[group]}</p>

      <p className="status status-warning evidence">
        <span aria-hidden="true">⚠</span>
        <span>
          <b>Sin evidencia para dinero real.</b> En el backtest ninguna estrategia pasó el umbral de p &lt; 0,00128 (39
          combinaciones probadas). Estas cifras son paper trading: sirven para comprobar, no para concluir. Revisión el 9 de
          febrero de 2027.
        </span>
      </p>

      {isLoading && <p className="muted">Cargando…</p>}
      {r && (
        <dl className="stats">
          <div className="stat">
            <dt>Operaciones</dt>
            <dd>{r.trades}</dd>
            <span className="stat-note">
              {r.ganadas} ganadas · {r.perdidas} perdidas
            </span>
          </div>
          <div className="stat">
            <dt>Acierto</dt>
            <dd>{r.acierto_pct == null ? '—' : `${fmtNum(r.acierto_pct, 0)} %`}</dd>
            <span className="stat-note">Con objetivo 1,5× el stop, el empate tras costes está cerca del 45 %</span>
          </div>
          <div className="stat stat-key">
            <dt>Resultado por operación</dt>
            <dd className={(r.r_promedio ?? 0) >= 0 ? 'pos' : 'neg'}>{fmtR(r.r_promedio)}</dd>
            <span className="stat-note">En R: 1 R es lo que se pierde si toca el stop</span>
          </div>
          <div className="stat">
            <dt>Profit factor</dt>
            <dd>{fmtNum(r.profit_factor, 2)}</dd>
            <span className="stat-note">Ganancias ÷ pérdidas. Menos de 1 pierde</span>
          </div>
          <div className="stat">
            <dt>Resultado total</dt>
            <dd className={(r.pnl_total ?? 0) >= 0 ? 'pos' : 'neg'}>{fmtMoney(r.pnl_total, true)}</dd>
            <span className="stat-note">{fmtR(r.r_total)} acumulados</span>
          </div>
        </dl>
      )}

      <div className="charts-2">
        <section className="panel">
          <SeriesChart
            kind="line"
            title="Resultado acumulado (R)"
            points={eqPoints}
            format={fmtRAxis}
            empty="Todavía no hay operaciones cerradas en este grupo."
          />
        </section>
        <section className="panel">
          <SeriesChart
            kind="bars"
            daily
            title="Resultado por día ($, hora de Ecuador)"
            points={dayPoints}
            format={fmtUsdAxis}
            empty="Sin días con operaciones cerradas en los últimos 120 días."
          />
        </section>
      </div>

      {perf && perf.porPar.length > 0 && (
        <section className="panel">
          <h2 className="panel-title">Por instrumento</h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Instrumento</th>
                <th scope="col" className="num">Operaciones</th>
                <th scope="col" className="num">Acierto</th>
                <th scope="col" className="num">R promedio</th>
                <th scope="col" className="num">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {perf.porPar.map((p) => (
                <tr key={p.pair}>
                  <th scope="row">{pairLabel(p.pair)}</th>
                  <td className="num">{p.trades}</td>
                  <td className="num">{p.acierto_pct == null ? '—' : `${fmtNum(p.acierto_pct, 0)} %`}</td>
                  <td className={`num ${(p.r_promedio ?? 0) >= 0 ? 'pos' : 'neg'}`}>{fmtR(p.r_promedio)}</td>
                  <td className={`num ${(p.pnl_total ?? 0) >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(p.pnl_total, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
