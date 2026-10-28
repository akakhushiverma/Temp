import { useRepoStore } from '../../store/repoStore'

const STAGES = [
  'Ingesting repository from GitHub…',
  'Parsing Abstract Syntax Trees…',
  'Building dependency graph…',
  'Scoring architectural health…',
  'Generating onboarding pathways…',
  'Ready to explore!',
]

export default function LoadingSpinner() {
  const { loadingStage } = useRepoStore()
  const idx = STAGES.findIndex(s => s === loadingStage)
  const current = Math.max(idx, 0)

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="spinner" />

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          Analysing repository
        </div>
        <div className="loading-stage">{loadingStage || 'Starting…'}</div>
      </div>

      {/* Stage progress */}
      <div style={{
        marginTop: 20,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '10px 16px',
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {STAGES.slice(0, -1).map((stage, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: i <= current ? 1 : 0.3,
              transition: 'opacity 0.3s',
            }}
          >
            <div style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: i < current
                ? 'var(--success)'
                : i === current
                ? 'var(--accent)'
                : 'var(--bg-card)',
              border: `1.5px solid ${i < current ? 'var(--success)' : i === current ? 'var(--accent)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.3s',
            }}>
              {i < current && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {i === current && (
                <div style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'pulse 1s ease-in-out infinite',
                }} />
              )}
            </div>
            <span style={{
              fontSize: 12,
              color: i < current
                ? 'var(--success)'
                : i === current
                ? 'var(--text-primary)'
                : 'var(--text-muted)',
              fontWeight: i === current ? 600 : 400,
            }}>
              {stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
