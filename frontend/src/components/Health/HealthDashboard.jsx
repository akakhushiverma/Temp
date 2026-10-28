import { useRepoStore } from '../../store/repoStore'

const GRADE_COLORS = {
  A: '#10b981', B: '#84cc16', C: '#f59e0b', D: '#f97316', F: '#ef4444',
}

function ScoreGauge({ score, grade }) {
  const r = 48
  const circ = 2 * Math.PI * r
  const strokeDash = (score / 100) * circ
  const color = GRADE_COLORS[grade] || '#8b5cf6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={10} />
        <circle
          cx={60} cy={60} r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${strokeDash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x={60} y={56} textAnchor="middle" fill={color} fontSize={22} fontWeight={700}>{score}</text>
        <text x={60} y={74} textAnchor="middle" fill="var(--text-dim)" fontSize={13}>/ 100</text>
      </svg>
      <div style={{
        marginTop: 6, fontSize: 24, fontWeight: 800, color,
        letterSpacing: 2,
      }}>
        Grade {grade}
      </div>
    </div>
  )
}

function MetricBar({ label, value, color }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-bar">
        <div
          className="metric-bar-fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function HealthDashboard() {
  const { healthData, circularData } = useRepoStore()

  if (!healthData) {
    return (
      <div className="health-dashboard">
        <div className="no-data">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
          <div>Health data not loaded</div>
        </div>
      </div>
    )
  }

  const { overall, grade, metrics, godFiles, technicalDebt, summary } = healthData

  return (
    <div className="health-dashboard">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--color-purple-light)' }}>
        🏥 Architectural Health Report
      </h2>

      {/* Overall score */}
      <div className="health-score-ring">
        <ScoreGauge score={overall} grade={grade} />
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Files', value: summary.totalFiles, icon: '📄' },
          { label: 'God Files', value: summary.godFileCount, icon: '👁', danger: summary.godFileCount > 0 },
          { label: 'Tech Debt Items', value: summary.technicalDebtCount, icon: '💸', danger: summary.technicalDebtCount > 3 },
          { label: 'High Risk Files', value: summary.highRiskFiles, icon: '🔥', danger: summary.highRiskFiles > 0 },
          { label: 'Circular Deps', value: circularData?.totalCycles || 0, icon: '♻', danger: (circularData?.totalCycles || 0) > 0 },
        ].map(({ label, value, icon, danger }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: `1px solid ${danger && value > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', padding: '10px 16px', flex: '1 1 140px',
          }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: danger && value > 0 ? 'var(--color-red)' : 'var(--text-primary)' }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Metric bars */}
      <div className="health-metrics-grid">
        <MetricBar label="Coupling Score" value={metrics.coupling} color="#8b5cf6" />
        <MetricBar label="Complexity Score" value={metrics.complexity} color="#06b6d4" />
        <MetricBar label="Cohesion Score" value={metrics.cohesion} color="#10b981" />
        <MetricBar label="Maintainability" value={metrics.maintainability} color="#f59e0b" />
      </div>

      {/* Circular deps */}
      {circularData && circularData.totalCycles > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: 'var(--color-red)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            ♻ Circular Dependencies ({circularData.totalCycles})
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>
              — Severity: {circularData.severity}
            </span>
          </h3>
          {circularData.cycles.slice(0, 5).map((cycle, i) => (
            <div key={i} style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 6,
              fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
              wordBreak: 'break-all',
            }}>
              {cycle.files.map((f, j) => (
                <span key={j}>
                  <span style={{ color: 'var(--color-red)' }}>{f.split('/').pop()}</span>
                  {j < cycle.files.length - 1 && <span style={{ color: 'var(--text-dim)' }}> → </span>}
                </span>
              ))}
              <span style={{ color: 'var(--text-dim)' }}> → ...</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
            {circularData.recommendation}
          </div>
        </div>
      )}

      {/* God Files */}
      {godFiles && godFiles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: 'var(--color-orange)', marginBottom: 10 }}>
            👁 God Files ({godFiles.length})
          </h3>
          {godFiles.slice(0, 5).map((file, i) => (
            <div key={i} style={{
              background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 6,
            }}>
              <div style={{ fontSize: 12, color: 'var(--color-orange)', fontWeight: 600, marginBottom: 4 }}>
                {file.path}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span>📏 {file.lines} lines</span>
                <span>📥 {file.importCount} imports</span>
                <span>ƒ {file.functionCount} functions</span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {file.reasons.map((r, j) => (
                  <span key={j} style={{
                    background: 'rgba(249,115,22,0.12)', color: 'var(--color-orange)',
                    borderRadius: 999, padding: '1px 8px', fontSize: 10,
                  }}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Technical Debt */}
      {technicalDebt && technicalDebt.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, color: 'var(--color-gold)', marginBottom: 10 }}>
            💸 Technical Debt Hotspots ({technicalDebt.length})
          </h3>
          {technicalDebt.slice(0, 5).map((item, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 6,
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
                {item.path}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span>CC: {item.complexity}</span>
                <span>Imports: {item.importCount}</span>
                <span style={{ color: 'var(--color-red)' }}>Debt Score: {item.debtScore}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
