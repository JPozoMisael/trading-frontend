import { useMeta } from '../api/hooks'
import { ChartWorkspace } from '../chart/ChartWorkspace'
import { AccountStrip, ModelPanel } from '../components/ModelPanel'
import { PairTabs, usePair } from '../components/PairTabs'

export function ChartPage() {
  const { data: meta } = useMeta()
  const [pair, setPair, pairs] = usePair()

  if (!pair) return <p className="page-msg">Cargando instrumentos…</p>

  return (
    <div className="chart-page">
      <div className="chart-col">
        <PairTabs pair={pair} pairs={pairs} onChange={setPair} />
        <ChartWorkspace pair={pair} granularity={meta?.granularity ?? 'H1'} />
      </div>
      <div className="side-col">
        <ModelPanel pair={pair} />
        <AccountStrip />
      </div>
    </div>
  )
}
