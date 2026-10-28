import { useRepoStore } from '../../store/repoStore'

export default function GraphControls() {
  // Read everything directly from the store — this component is never given props from a parent
  const { graphData, graphSettings, updateGraphSettings } = useRepoStore()

  const languages = graphData
    ? ['all', ...new Set(graphData.nodes.map(n => n.language)).values()]
    : ['all']

  if (!graphData) return null

  return (
    <div style={{
      position: 'absolute',
      top: 52,
      right: 10,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      userSelect: 'none',
    }}>
      {/* Language filter */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '8px 10px',
        boxShadow: 'var(--shadow-sm)',
        minWidth: 130,
      }}>
        <div style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 6,
          fontWeight: 600,
        }}>
          Language
        </div>
        <select
          value={graphSettings.filterLanguage}
          onChange={e => updateGraphSettings({ filterLanguage: e.target.value })}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--r-sm)',
            padding: '4px 8px',
            fontSize: 12,
            cursor: 'pointer',
            width: '100%',
            outline: 'none',
          }}
        >
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Toggles */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '8px 10px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {[
          { key: 'showLabels',    label: 'Labels' },
          { key: 'showClusters',  label: 'Clusters' },
          { key: 'showHeatmap',   label: 'Heatmap' },
        ].map(({ key, label }) => (
          <label key={key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', fontSize: 12,
            color: graphSettings[key] ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>
            <input
              type="checkbox"
              checked={!!graphSettings[key]}
              onChange={() => updateGraphSettings({ [key]: !graphSettings[key] })}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}
