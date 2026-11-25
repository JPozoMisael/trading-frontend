import { useState } from 'react'
import { useMeta, useTrades } from '../api/hooks'
import type { Group, Mode } from '../api/types'
import { Segmented } from '../components/Segmented'
import { fmtDateTime, fmtDuration, fmtMoney, fmtNum, fmtPct, fmtPrice, fmtR, pairLabel } from '../lib/format'
import { GROUP_HELP, GROUP_OPTIONS, MODE_OPTIONS } from './filters'

const PAGE = 25
const EXIT: Record<string, string> = {
  tp: 'Objetivo',
  sl: 'Stop',
  manual: 'Manual',
  stop_out: 'Stop out',
  end_of_data: 'Fin de datos',
}

export function TradesPage() {
  const { data: meta } = useMeta()
  const [group, setGroup] = useState<Group>('modelo')
  const [mode, setMode] = useState<Mode>('sim')
  const [pair, setPair] = useState('')
  const [page, setPage] = useState(0)
  const { data, isLoading, isFetching } = useTrades({ group, mode, pair: pair || undefined, limit: PAGE, offset: page * PAGE })
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1

  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(0)
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Operaciones</h1>
        <div className="filters">
          <Segmented label="Quién operó" value={group} options={GROUP_OPTIONS} onChange={reset(setGroup)} />
          <Segmented label="Cuenta" value={mode} options={MODE_OPTIONS} onChange={reset(setMode)} />
          <label className="select">
            <span className="sr-only">Instrumento</span>
            <select value={pair} onChange={(e) => reset(setPair)(e.target.value)}>
              <option value="">Todos los instrumentos</option>
              {meta?.pairs.map((p) => (
                <option key={p} value={p}>
                  {pairLabel(p)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <p className="lede">{GROUP_HELP[group]}</p>

      <section className="panel table-wrap" aria-busy={isFetching}>
        {isLoading ? (
          <p className="muted">Cargando…</p>
        ) : !data?.rows.length ? (
          <p className="muted empty">
            No hay operaciones cerradas con estos filtros. Cuando el sistema cierre una, aparece aquí sin recargar.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Cerrada</th>
                <th scope="col">Instrumento</th>
                <th scope="col">Lado</th>
                <th scope="col" className="num">Confianza</th>
                <th scope="col" className="num">Entrada</th>
                <th scope="col" className="num">Salida</th>
                <th scope="col">Motivo</th>
                <th scope="col" className="num">Duración</th>
                <th scope="col" className="num">Lotes</th>
                <th scope="col" className="num">R</th>
                <th scope="col" className="num">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDateTime(t.closed_at)}</td>
                  <th scope="row">{pairLabel(t.pair)}</th>
                  <td>
                    <span className={t.direction === 'buy' ? 'tag-buy' : 'tag-sell'}>{t.direction === 'buy' ? 'Compra' : 'Venta'}</span>
                  </td>
                  <td className="num">{fmtPct(t.confidence)}</td>
                  <td className="num">{fmtPrice(t.entry_price, t.pair)}</td>
                  <td className="num">{fmtPrice(t.exit_price, t.pair)}</td>
                  <td>{t.exit_reason ? (EXIT[t.exit_reason] ?? t.exit_reason) : '—'}</td>
                  <td className="num">{fmtDuration(t.opened_at, t.closed_at)}</td>
                  <td className="num">{fmtNum(t.volume_lots, 2)}</td>
                  <td className={`num ${(t.r_multiple ?? 0) >= 0 ? 'pos' : 'neg'}`}>{fmtR(t.r_multiple)}</td>
                  <td className={`num ${(t.pnl ?? 0) >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(t.pnl, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {data && data.total > PAGE && (
        <nav className="pager" aria-label="Páginas">
          <button type="button" className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anteriores
          </button>
          <span className="muted">
            Página {page + 1} de {pages} · {data.total} operaciones
          </span>
          <button type="button" className="btn" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Siguientes
          </button>
        </nav>
      )}
    </div>
  )
}
