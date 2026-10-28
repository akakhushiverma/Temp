import { useRepoStore } from '../../store/repoStore'

const SEVERITY_COLORS = {
  none: 'var(--color-green)',
  low: 'var(--color-gold)',
  medium: 'var(--color-orange)',
  high: 'var(--color-red)',
}

export default function BlastRadiusMap() {
  const { onboardingData, selectedFile, setSelectedNode } = useRepoStore()

  if (!onboardingData?.blastRadiusMap) {
    return <div className="no-data">No blast radius data available</div>
  }

  const blastMap = onboardingData.blastRadiusMap
  const currentBlast = selectedFile ? blastMap[selectedFile] : null

  // Top 10 highest blast radius files
  const topBlast = Object.entries(blastMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)

  return (
    <div>
      {selectedFile && currentBlast && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Selected: <span style={{ color: 'var(--color-purple-light)' }}>{selectedFile.split('/').pop()}</span>
          </div>
          <div style={{
            background: `${SEVERITY_COLORS[currentBlast.severity]}15`,
            border: `1px solid ${SEVERITY_COLORS[currentBlast.severity]}40`,
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>💥</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: SEVERITY_COLORS[currentBlast.severity] }}>
                  {currentBlast.count}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>files would be affected</div>
              </div>
              <span style={{
                marginLeft: 'auto',
                background: `${SEVERITY_COLORS[currentBlast.severity]}22`,
                color: SEVERITY_COLORS[currentBlast.severity],
                borderRadius: 999,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                {currentBlast.severity} impact
              </span>
            </div>
            {currentBlast.dependents.slice(0, 5).map((dep, i) => (
              <div
                key={i}
                style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '2px 0', cursor: 'pointer' }}
                onClick={() => setSelectedNode(dep)}
              >
                ← {dep}
              </div>
            ))}
            {currentBlast.count > 5 && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>+{currentBlast.count - 5} more</div>
            )}
          </div>
        </div>
      )}

      {!selectedFile && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Click a node in the graph to see its blast radius
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        Top High-Impact Files
      </div>
      {topBlast.map(([path, data], i) => (
        <div
          key={path}
          className="pathway-item"
          onClick={() => setSelectedNode(path)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 18, flexShrink: 0 }}>#{i + 1}</span>
            <span style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
              {path.split('/').pop()}
            </span>
            <span style={{
              background: `${SEVERITY_COLORS[data.severity]}22`,
              color: SEVERITY_COLORS[data.severity],
              borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}>
              💥 {data.count}
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 26, marginTop: 2, wordBreak: 'break-all' }}>
            {path}
          </div>
        </div>
      ))}
    </div>
  )
}
