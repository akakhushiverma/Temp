import { useEffect } from 'react'
import { useRepoStore } from './store/repoStore'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import DependencyGraph from './components/Graph/DependencyGraph'
import CodePanel from './components/Explorer/CodePanel'
import HealthDashboard from './components/Health/HealthDashboard'
import PathfinderPanel from './components/Onboarding/PathfinderPanel'

const EXAMPLE_REPOS = [
  'facebook/react',
  'vercel/next.js',
  'vitejs/vite',
  'expressjs/express',
]

const FEATURES = [
  { icon: '⬡', label: 'Dependency Graph' },
  { icon: '⊙', label: 'AST Parsing' },
  { icon: '⟲', label: 'Circular Deps' },
  { icon: '◈', label: 'Health Score' },
  { icon: '⊞', label: 'Onboarding Map' },
  { icon: '▦', label: 'Complexity Map' },
  { icon: '⊕', label: 'Blast Radius' },
  { icon: '⌕', label: 'Live Search' },
]

function LoadingOverlay() {
  const { loadingStage } = useRepoStore()
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <div className="loading-stage">{loadingStage || 'Analysing repository…'}</div>
    </div>
  )
}

function WelcomeScreen() {
  const { ingestRepo } = useRepoStore()

  const handleExample = (slug) => {
    ingestRepo(`https://github.com/${slug}`)
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-inner fade-in">
        {/* Logo */}
        <div className="welcome-logo">
          <svg width="26" height="26" viewBox="0 0 20 20" fill="white">
            <rect x="1" y="1" width="7.5" height="7.5" rx="1.5" />
            <rect x="11.5" y="1" width="7.5" height="7.5" rx="1.5" />
            <rect x="1" y="11.5" width="7.5" height="7.5" rx="1.5" />
            <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="1.5" />
          </svg>
        </div>

        <h1 className="welcome-title">RepoSketch</h1>
        <p className="welcome-subtitle">
          Visualise any GitHub repository as an interactive architecture graph.<br />
          Explore dependencies, complexity, and code health at a glance.
        </p>

        {/* Example chips */}
        <div className="example-chips">
          <span className="example-label">Try →</span>
          {EXAMPLE_REPOS.map(slug => (
            <button
              key={slug}
              className="example-chip"
              onClick={() => handleExample(slug)}
            >
              {slug}
            </button>
          ))}
        </div>

        {/* Feature grid */}
        <div className="welcome-features">
          {FEATURES.map(f => (
            <div key={f.label} className="welcome-feature">
              <div className="welcome-feature-icon">{f.icon}</div>
              <div>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const {
    isLoading, repoId, viewMode, error, theme,
  } = useRepoStore()

  /* Apply theme class to document root */
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    root.classList.add(`theme-${theme}`)
  }, [theme])

  return (
    <div className={`app-shell theme-${theme}`}>
      <Header />

      <div className="app-body">
        <Sidebar />

        <main className="app-main" style={{ position: 'relative' }}>
          {/* Loading overlay */}
          {isLoading && <LoadingOverlay />}

          {/* Error banner */}
          {!isLoading && error && (
            <div className="error-banner">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Main content */}
          {!isLoading && repoId && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

              {viewMode === 'graph' && (
                <div className="graph-layout">
                  {/* Graph title bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div className="graph-toolbar">
                      <span className="graph-title">Software Architecture Dependency Graph</span>
                      <div className="graph-toolbar-right">
                        <button className="graph-tool-btn" title="Zoom in">+</button>
                        <button className="graph-tool-btn" title="Zoom out">−</button>
                        <button className="graph-tool-btn" title="Settings">⚙</button>
                        <button className="graph-tool-btn" title="Split view">⊞</button>
                        <button className="graph-tool-btn" title="Full screen">⊡</button>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                      <DependencyGraph />
                    </div>
                  </div>
                  <CodePanel />
                </div>
              )}

              {viewMode === 'health' && (
                <HealthDashboard />
              )}

              {viewMode === 'onboarding' && (
                <PathfinderPanel />
              )}
            </div>
          )}

          {/* Welcome screen */}
          {!isLoading && !repoId && <WelcomeScreen />}
        </main>
      </div>
    </div>
  )
}
