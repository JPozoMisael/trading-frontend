import { useSearchParams } from 'react-router'
import { useMeta } from '../api/hooks'
import { pairLabel } from '../lib/format'

/** Instrumento elegido, guardado en la URL (?par=XAU_USD) para poder compartir o recargar. */
export function usePair(): [string, (p: string) => void, string[]] {
  const { data: meta } = useMeta()
  const [params, setParams] = useSearchParams()
  const pairs = meta?.pairs ?? []
  const fromUrl = params.get('par')
  const pair = fromUrl && pairs.includes(fromUrl) ? fromUrl : (pairs[0] ?? '')
  const set = (p: string) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        n.set('par', p)
        return n
      },
      { replace: true },
    )
  return [pair, set, pairs]
}

export function PairTabs({ pair, pairs, onChange }: { pair: string; pairs: string[]; onChange: (p: string) => void }) {
  return (
    <div className="pair-tabs" role="tablist" aria-label="Instrumento">
      {pairs.map((p) => (
        <button key={p} type="button" role="tab" aria-selected={p === pair} className="pair-tab" onClick={() => onChange(p)}>
          {pairLabel(p)}
        </button>
      ))}
    </div>
  )
}
