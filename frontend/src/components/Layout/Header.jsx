import { useState } from 'react'
import { useRepoStore } from '../../store/repoStore'

const NAV_ITEMS = [
  { mode: 'graph',      label: 'Graph' },
  { mode: 'health',     label: 'Health' },
  { mode: 'onboarding', label: 'Explore' },
]

/* SVG icons — inline, no icon lib dependency */
function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14.5 10.8A7 7 0 0 1 5.2 1.5 7 7 0 1 0 14.5 10.8z" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="3.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a5 5 0 0 0-5 5v3L1.5 11h13L13 9V6a5 5 0 0 0-5-5zM6.5 13a1.5 1.5 0 0 0 3 0h-3z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 5a3 3 0 1 0 0 6A3 3 0 0 0 8 5zm0 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
      <path d="M8 0a1 1 0 0 1 .97.757l.36 1.44a5.97 5.97 0 0 1 1.32.77l1.4-.5a1 1 0 0 1 1.22.46l1 1.73a1 1 0 0 1-.23 1.28l-1.13.9a6.1 6.1 0 0 1 0 1.53l1.13.9a1 1 0 0 1 .23 1.27l-1 1.73a1 1 0 0 1-1.22.46l-1.4-.5a5.97 5.97 0 0 1-1.32.77l-.36 1.44A1 1 0 0 1 8 16a1 1 0 0 1-.97-.757l-.36-1.44a5.97 5.97 0 0 1-1.32-.77l-1.4.5a1 1 0 0 1-1.22-.46l-1-1.73a1 1 0 0 1 .23-1.28l1.13-.9a6.1 6.1 0 0 1 0-1.53l-1.13-.9A1 1 0 0 1 1.73 5.5l1-1.73a1 1 0 0 1 1.22-.46l1.4.5a5.97 5.97 0 0 1 1.32-.77l.36-1.44A1 1 0 0 1 8 0z" />
    </svg>
  )
}

function IconLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  )
}

function SpinIcon() {
  return (
    <span style={{
      display: 'inline-block',
      width: 10, height: 10,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

export default function Header() {
  const {
    repoUrl, setRepoUrl, ingestRepo,
    isLoading, repoId, repoMeta,
    viewMode, setViewMode, error,
    theme, toggleTheme,
  } = useRepoStore()

  const [localUrl, setLocalUrl] = useState('')

  const status = isLoading ? 'loading' : error ? 'error' : repoId ? 'ready' : 'idle'
  const statusLabel = { idle: 'idle', loading: 'analysing…', ready: 'ready', error: 'error' }

  const handleSubmit = (e) => {
    e.preventDefault()
    const url = (localUrl || repoUrl).trim()
    if (!url) return
    setRepoUrl(url)
    ingestRepo(url)
  }

  return (
    <header className="app-header">
      {/* Brand */}
      <div className="header-brand">
        <div className="header-brand-icon">
          <IconLogo />
        </div>
        <span className="header-brand-name">RepoSketch</span>
      </div>

      {/* Search / URL input — centre */}
      <div className="header-search-wrap">
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
          <div className="header-search" style={{ flex: 1 }}>
            <IconSearch />
            <input
              type="text"
              placeholder="Enter GitHub repository URL…"
              value={localUrl}
              onChange={e => setLocalUrl(e.target.value)}
              spellCheck={false}
              aria-label="GitHub repository URL"
            />
          </div>
          <button className="btn-explore" type="submit" disabled={isLoading}>
            {isLoading ? <><SpinIcon /> Analysing</> : 'Analyse'}
          </button>
        </form>
      </div>

      {/* Nav tabs — only when repo loaded */}
      {repoId && (
        <nav className="header-nav" aria-label="View mode">
          {NAV_ITEMS.map(item => (
            <button
              key={item.mode}
              className={`nav-tab${viewMode === item.mode ? ' active' : ''}`}
              onClick={() => setViewMode(item.mode)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {/* Right controls */}
      <div className="header-right">
        {/* Status */}
        <div className="status-badge">
          <span className={`status-dot ${status}`} />
          <span>{statusLabel[status]}</span>
        </div>

        {/* Settings */}
        <button className="icon-btn" title="Settings" aria-label="Settings">
          <IconSettings />
        </button>

        {/* Notifications */}
        <button className="icon-btn" title="Notifications" aria-label="Notifications">
          <IconBell />
        </button>

        {/* Theme toggle */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>

        {/* Avatar */}
        <div style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
          flexShrink: 0,
          cursor: 'pointer',
        }}>
          U
        </div>
      </div>
    </header>
  )
}
