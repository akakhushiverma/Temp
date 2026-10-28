import { useRepoStore } from '../../store/repoStore'

const HEAT_STOPS = [
  { pct: 0, color: '#10b981', label: 'Cool' },
  { pct: 0.25, color: '#84cc16', label: '' },
  { pct: 0.5, color: '#f59e0b', label: 'Warm' },
  { pct: 0.75, color: '#f97316', label: '' },
  { pct: 1, color: '#ef4444', label: 'Hot' },
]

function getHeatColor(heat) {
  if (heat < 0.2) return '#10b981'
  if (heat < 0.4) return '#84cc16'
  if (heat < 0.6) return '#f59e0b'
  if (heat < 0.8) return '#f97316'
  return '#ef4444'
}

export default function HeatmapOverlay() {
  const { healthData, updateGraphSettings, graphSettings } = useRepoStore()
  const heatmap = healthData?.heatmap || []
  const top10 = heatmap.slice(0, 10)

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>🔥 Complexity Heatmap</span>
        <button
          onClick={() => updateGraphSettings({ showHeatmap: !graphSettings.showHeatmap })}
          style={{
            marginLeft: 'auto',
            background: graphSettings.showHeatmap ? 'rgba(239,68,68,0.15)' : 'var(--bg-elevated)',
            border: `1px solid ${graphSettings.showHeatmap ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
            color: graphSettings.showHeatmap ? '#ef4444' : 'var(--text-secondary)',
            borderRadius: 'var(--radius)', padding: '4px 10px', fontSize: 11, cursor: 'pointer',
          }}
        >
          {graphSettings.showHeatmap ? '✓ Active' : 'Activate'}
        </button>
      </div>

      {/* Legend */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          height: 12, borderRadius: 6,
          background: 'linear-gradient(to right, #10b981, #84cc16, #f59e0b, #f97316, #ef4444)',
          marginBottom: 4,
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
          <span>Low Risk</span>
          <span>Medium</span>
          <span>High Risk</span>
        </div>
      </div>

      {/* Top hotspots */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Top 10 Hotspots
      </div>
      {top10.map((item, i) => (
        <div key={item.path} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', width: 16 }}>#{i + 1}</span>
            <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
              {item.path.split('/').pop()}
            </span>
            <span style={{ color: getHeatColor(item.heat), fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
              {Math.round(item.heat * 100)}%
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden', marginLeft: 22 }}>
            <div style={{
              height: '100%', width: `${item.heat * 100}%`,
              background: getHeatColor(item.heat), borderRadius: 2,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      ))}

      {top10.length === 0 && <div className="no-data">No heatmap data</div>}
    </div>
  )
}
