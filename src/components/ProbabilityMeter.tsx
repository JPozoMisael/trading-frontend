import { fmtPct } from '../lib/format'

interface Props {
  label: string
  side: 'long' | 'short'
  p: number | null
  umbral: number
}

/**
 * Probabilidad de que la compra (o venta) toque el objetivo antes que el stop,
 * contra la línea de latón del umbral. El sistema solo opera si la cruza.
 */
export function ProbabilityMeter({ label, side, p, umbral }: Props) {
  const v = p ?? 0
  const pasa = p != null && p >= umbral
  return (
    <div className={`meter meter-${side}`}>
      <div className="meter-head">
        <span className="meter-label">{label}</span>
        <span className="meter-value">{p == null ? '—' : fmtPct(p)}</span>
      </div>
      <div
        className="meter-track"
        role="meter"
        aria-label={`${label}: probabilidad`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        aria-valuetext={`${fmtPct(p)}; umbral ${fmtPct(umbral)}`}
      >
        <div className="meter-fill" style={{ width: `${Math.min(100, v * 100)}%` }} />
        <div className="meter-threshold" style={{ left: `${umbral * 100}%` }} aria-hidden="true" />
      </div>
      <div className="meter-foot">
        {pasa ? (
          <span className="meter-verdict is-pass">Cruza el umbral: el sistema opera</span>
        ) : (
          <span className="meter-verdict">
            {p == null ? 'Sin evaluación' : `Le faltan ${Math.ceil((umbral - v) * 100)} puntos para el umbral`}
          </span>
        )}
      </div>
    </div>
  )
}
