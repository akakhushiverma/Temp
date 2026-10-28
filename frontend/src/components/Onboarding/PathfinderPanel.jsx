import { useState } from 'react'
import { useRepoStore } from '../../store/repoStore'
import BlastRadiusMap from './BlastRadiusMap'

const LANG_ICONS = {
  javascript: '🟨', typescript: '🟦', python: '🐍',
  java: '☕', go: '🔵', rust: '🦀', default: '📄',
}

export default function PathfinderPanel() {
  const { onboardingData, setSelectedNode } = useRepoStore()
  const [activeSection, setActiveSection] = useState('gfi')

  if (!onboardingData) {
    return (
      <div className="pathfinder-panel">
        <div className="no-data">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺</div>
          <div>Onboarding data not loaded</div>
        </div>
      </div>
    )
  }

  const { goodFirstIssues, entryPoints, learningPath, summary } = onboardingData

  return (
    <div className="pathfinder-panel">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--color-gold)' }}>
        🗺 Smart Onboarding Pathfinder
      </h2>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Navigate {summary.totalFiles} files from simple to complex
      </p>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Starter Files', value: summary.goodFirstCount, color: 'var(--color-green)' },
          { label: 'Entry Points', value: summary.entryPointCount, color: 'var(--color-cyan)' },
          { label: 'Avg Blast Radius', value: summary.avgBlastRadius, color: 'var(--color-orange)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '8px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'gfi', label: '🌱 Good First Files' },
          { id: 'entry', label: '⚓ Entry Points' },
          { id: 'path', label: '📚 Learning Path' },
          { id: 'blast', label: '💥 Blast Radius' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              background: activeSection === tab.id ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${activeSection === tab.id ? 'var(--color-gold)' : 'var(--border)'}`,
              color: activeSection === tab.id ? 'var(--color-gold)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius)',
              padding: '4px 10px', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Good First Issues */}
      {activeSection === 'gfi' && (
        <div className="pathfinder-section">
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            Files ideal for newcomers — low complexity, minimal dependencies
          </div>
          {goodFirstIssues.map((item, i) => (
            <div
              key={i}
              className="pathway-item"
              onClick={() => setSelectedNode(item.path)}
            >
              <div className="pathway-item-header">
                <span style={{ fontSize: 16 }}>{LANG_ICONS[item.language] || LANG_ICONS.default}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.path.split('/').pop()}
                </span>
                <span className={`difficulty-badge ${item.difficulty}`}>{item.difficulty}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', wordBreak: 'break-all', marginBottom: 4 }}>
                {item.path}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-secondary)' }}>
                <span>CC:{item.complexity || 1}</span>
                <span>📥{item.imports || 0} imports</span>
                <span>📏{item.lines || 0} lines</span>
                <span style={{ color: item.blastRadius > 5 ? 'var(--color-orange)' : 'var(--text-dim)' }}>
                  💥 blast:{item.blastRadius}
                </span>
              </div>
            </div>
          ))}
          {goodFirstIssues.length === 0 && (
            <div className="no-data">No starter files identified</div>
          )}
        </div>
      )}

      {/* Entry Points */}
      {activeSection === 'entry' && (
        <div className="pathfinder-section">
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            Core files imported by many others — architectural anchors
          </div>
          {entryPoints.map((item, i) => (
            <div
              key={i}
              className="pathway-item"
              onClick={() => setSelectedNode(item.path)}
            >
              <div className="pathway-item-header">
                <span style={{ fontSize: 16 }}>{LANG_ICONS[item.language] || LANG_ICONS.default}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.path.split('/').pop()}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-cyan)', background: 'rgba(6,182,212,0.15)', borderRadius: 999, padding: '2px 8px' }}>
                  ⚓ {item.inDegree} importers
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', wordBreak: 'break-all', marginBottom: 4 }}>
                {item.path}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Learning Path */}
      {activeSection === 'path' && (
        <div className="pathfinder-section">
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            Recommended exploration order — beginner to advanced
          </div>
          {learningPath.map((item) => (
            <div
              key={item.order}
              className="pathway-item"
              onClick={() => setSelectedNode(item.path)}
            >
              <div className="pathway-item-header">
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                  color: 'var(--text-dim)',
                }}>
                  {item.order}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.path.split('/').pop()}
                </span>
                <span className={`difficulty-badge ${item.difficulty}`}>{item.difficulty}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 32 }}>
                {item.reason}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blast Radius */}
      {activeSection === 'blast' && <BlastRadiusMap />}
    </div>
  )
}
