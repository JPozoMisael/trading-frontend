import type { ReactNode } from 'react'
import type { Tool } from './drawings'

/** Iconos propios (trazo de 1.5 px sobre 20x20). */
const I = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    {children}
  </svg>
)

const TOOLS: { id: Tool; name: string; key: string; icon: ReactNode }[] = [
  {
    id: 'cursor',
    name: 'Seleccionar',
    key: 'V',
    icon: (
      <I>
        <path d="M5 3l10 6.5-4.5 1L8.5 15z" strokeLinejoin="round" />
      </I>
    ),
  },
  {
    id: 'trend',
    name: 'Línea de tendencia',
    key: 'T',
    icon: (
      <I>
        <path d="M3.5 16.5l13-13" />
        <circle cx="3.5" cy="16.5" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="3.5" r="1.6" fill="currentColor" stroke="none" />
      </I>
    ),
  },
  {
    id: 'hline',
    name: 'Línea horizontal (soporte o resistencia)',
    key: 'H',
    icon: (
      <I>
        <path d="M2 10h16" />
        <path d="M5 6.5h3M12 13.5h3" opacity=".5" />
      </I>
    ),
  },
  {
    id: 'rect',
    name: 'Zona',
    key: 'Z',
    icon: (
      <I>
        <rect x="3" y="5.5" width="14" height="9" rx="1" />
      </I>
    ),
  },
  {
    id: 'fib',
    name: 'Retroceso de Fibonacci',
    key: 'F',
    icon: (
      <I>
        <path d="M3 4h14M3 8h14M3 11h14M3 16h14" />
        <path d="M4 16L16 4" opacity=".45" />
      </I>
    ),
  },
  {
    id: 'measure',
    name: 'Medir (pips, %, velas)',
    key: 'M',
    icon: (
      <I>
        <rect x="2.5" y="7" width="15" height="6" rx="1" transform="rotate(-35 10 10)" />
        <path d="M7 8.2l1 1.4M9.4 6.6l1 1.4M11.8 5l1 1.4" transform="rotate(0)" />
      </I>
    ),
  },
]

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.key.toLowerCase(), t.id]))

interface Props {
  tool: Tool
  onTool: (t: Tool) => void
  magnet: boolean
  onMagnet: () => void
  hidden: boolean
  onHidden: () => void
  canUndo: boolean
  onUndo: () => void
  count: number
  onClear: () => void
}

export function ToolRail(p: Props) {
  return (
    <nav className="rail" aria-label="Herramientas de dibujo">
      <div className="rail-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="rail-btn"
            aria-pressed={p.tool === t.id}
            title={`${t.name} (${t.key})`}
            aria-label={t.name}
            onClick={() => p.onTool(t.id)}
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div className="rail-group">
        <button
          type="button"
          className="rail-btn"
          aria-pressed={p.magnet}
          title="Imán: pega el punto al máximo, mínimo, apertura o cierre más cercano"
          aria-label="Imán a OHLC"
          onClick={p.onMagnet}
        >
          <I>
            <path d="M5 4v6a5 5 0 0010 0V4" />
            <path d="M5 4h3v6M12 4h3" />
          </I>
        </button>
        <button
          type="button"
          className="rail-btn"
          aria-pressed={p.hidden}
          title={p.hidden ? 'Mostrar dibujos' : 'Ocultar dibujos'}
          aria-label={p.hidden ? 'Mostrar dibujos' : 'Ocultar dibujos'}
          onClick={p.onHidden}
        >
          <I>
            <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
            <circle cx="10" cy="10" r="2.2" />
            {p.hidden && <path d="M3.5 3.5l13 13" />}
          </I>
        </button>
        <button type="button" className="rail-btn" disabled={!p.canUndo} title="Deshacer el último dibujo (Ctrl+Z)" aria-label="Deshacer" onClick={p.onUndo}>
          <I>
            <path d="M7 5L3.5 8.5 7 12" />
            <path d="M4 8.5h7.5a4.5 4.5 0 010 9H9" />
          </I>
        </button>
        <button
          type="button"
          className="rail-btn"
          disabled={!p.count}
          title={`Borrar los ${p.count} dibujos de este instrumento`}
          aria-label="Borrar todos los dibujos"
          onClick={p.onClear}
        >
          <I>
            <path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" />
          </I>
        </button>
      </div>
    </nav>
  )
}
