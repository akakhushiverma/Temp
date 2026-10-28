import { useState, useMemo } from 'react'
import { useRepoStore } from '../../store/repoStore'

/* ── Icons (inline SVG, no lib) ───────────────────────────── */
function IconFolder({ open }) {
  return open ? (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#f59e0b' }}>
      <path d="M1 3a1 1 0 0 1 1-1h4l1.5 2H14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3z" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#94a3b8' }}>
      <path d="M1 3a1 1 0 0 1 1-1h4l1.5 2H14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3z" />
    </svg>
  )
}

function IconCaret({ open }) {
  return (
    <svg
      width="9" height="9" viewBox="0 0 8 8"
      fill="currentColor"
      style={{
        color: 'var(--text-muted)',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s',
        flexShrink: 0,
      }}
    >
      <path d="M2 1l4 3-4 3V1z" />
    </svg>
  )
}

function IconFile({ language }) {
  const colors = {
    javascript: '#f59e0b', typescript: '#3b82f6', python: '#34d399',
    java: '#f97316', css: '#a78bfa', scss: '#e879f9', html: '#f97316',
    json: '#94a3b8', markdown: '#64748b', go: '#2dd4bf', rust: '#fb923c',
    vue: '#4ade80', ruby: '#f87171',
  }
  const c = colors[language] || '#64748b'
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="0.5" width="8" height="11" rx="1" stroke={c} strokeWidth="1" fill={c + '18'} />
      <line x1="3" y1="4" x2="7" y2="4" stroke={c} strokeWidth="0.8" />
      <line x1="3" y1="6" x2="7" y2="6" stroke={c} strokeWidth="0.8" />
      <line x1="3" y1="8" x2="5.5" y2="8" stroke={c} strokeWidth="0.8" />
    </svg>
  )
}

function IconCollapse() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7h8M7 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="5.5" cy="5.5" r="4" />
      <path d="M9 9l3 3" strokeLinecap="round" />
    </svg>
  )
}

/* ── Build tree from flat file list ────────────────────────── */
function buildTree(fileList) {
  const root = {}
  fileList.forEach(file => {
    const parts = (file.path || file).split('/')
    let cur = root
    parts.forEach((part, i) => {
      if (!cur[part]) cur[part] = { __files: [], __dirs: {} }
      if (i === parts.length - 1) {
        cur[part].__leaf = file
      }
      cur = cur[part].__dirs
    })
  })
  return root
}

/* ── Recursive tree node ────────────────────────────────────── */
function TreeNode({ name, data, depth, selectedFile, onSelect, langMap }) {
  const [open, setOpen] = useState(depth < 2)

  const isFile = !!data.__leaf
  const hasChildren = Object.keys(data.__dirs || {}).length > 0
  const indent = depth * 14 + 8

  if (isFile) {
    const file = data.__leaf
    const fileId = typeof file === 'string' ? file : file.id || file.path
    const language = langMap[fileId] || 'unknown'
    const isActive = selectedFile === fileId

    return (
      <div
        className={`tree-item${isActive ? ' active' : ''}`}
        style={{ paddingLeft: indent }}
        onClick={() => onSelect(fileId)}
        title={fileId}
      >
        {/* spacer for caret area */}
        <span style={{ width: 12, flexShrink: 0 }} />
        <span className="tree-item-icon">
          <IconFile language={language} />
        </span>
        <span className="tree-item-name">{name}</span>
      </div>
    )
  }

  return (
    <>
      <div
        className="tree-item"
        style={{ paddingLeft: indent }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="tree-item-caret" style={{ width: 12, flexShrink: 0 }}>
          <IconCaret open={open} />
        </span>
        <span className="tree-item-icon">
          <IconFolder open={open} />
        </span>
        <span className="tree-item-name" style={{ color: open ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {name}
        </span>
      </div>
      {open && hasChildren && Object.entries(data.__dirs).map(([childName, childData]) => (
        <TreeNode
          key={childName}
          name={childName}
          data={childData}
          depth={depth + 1}
          selectedFile={selectedFile}
          onSelect={onSelect}
          langMap={langMap}
        />
      ))}
    </>
  )
}

/* ── Sidebar component ──────────────────────────────────────── */
export default function Sidebar() {
  const { repoId, repoMeta, fileTree, graphData, selectedFile, setSelectedNode } = useRepoStore()
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')

  /* Build a language lookup from graph nodes */
  const langMap = useMemo(() => {
    const m = {}
    ;(graphData?.nodes || []).forEach(n => { m[n.id] = n.language })
    return m
  }, [graphData])

  /* Build tree from fileTree */
  const tree = useMemo(() => {
    const files = fileTree || []
    return buildTree(files)
  }, [fileTree])

  /* Filtered flat list for search */
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return (fileTree || [])
      .filter(f => {
        const p = typeof f === 'string' ? f : f.path || f.id || ''
        return p.toLowerCase().includes(q)
      })
      .slice(0, 30)
  }, [search, fileTree])

  if (collapsed) {
    return (
      <aside style={{
        width: 34,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 10,
        flexShrink: 0,
        transition: 'width 0.2s',
      }}>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          style={{ transform: 'rotate(180deg)' }}
        >
          <IconCollapse />
        </button>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-title">File Explorer</span>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
        >
          <IconCollapse />
        </button>
      </div>

      {/* Search box */}
      <div style={{ padding: '6px 10px 2px', flexShrink: 0 }}>
        <div className="sidebar-search">
          <IconSearch />
          <input
            placeholder="Search files…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Repo meta */}
      {repoMeta && (
        <div className="repo-meta-card" style={{ margin: '6px 10px' }}>
          <div className="repo-meta-name">
            {repoMeta.fullName || 'Repository'}
          </div>
          {repoMeta.description && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
              {repoMeta.description.length > 70
                ? repoMeta.description.slice(0, 68) + '…'
                : repoMeta.description}
            </div>
          )}
          <div className="repo-meta-stats">
            {repoMeta.stars != null && (
              <div className="repo-meta-stat">
                <span>★</span>
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                  {repoMeta.stars.toLocaleString()}
                </span>
              </div>
            )}
            {repoMeta.totalFiles != null && (
              <div className="repo-meta-stat">
                <span style={{ color: 'var(--text-muted)' }}>
                  {repoMeta.totalFiles} files
                </span>
              </div>
            )}
            {repoMeta.language && (
              <div className="repo-meta-stat">
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  fontSize: 10,
                  fontWeight: 600,
                }}>
                  {repoMeta.language}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="sidebar-content">
        {!repoId && (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-text">
              Enter a GitHub URL above<br />to explore its files
            </div>
          </div>
        )}

        {repoId && search.trim() && (
          /* Search results */
          <div className="file-tree">
            {searchResults.length === 0 && (
              <div className="empty-state" style={{ paddingTop: 20 }}>
                <div className="empty-state-text">No files match "{search}"</div>
              </div>
            )}
            {searchResults.map((file, i) => {
              const fileId = typeof file === 'string' ? file : file.path || file.id || ''
              const language = langMap[fileId] || 'unknown'
              const isActive = selectedFile === fileId
              const name = fileId.split('/').pop()
              return (
                <div
                  key={i}
                  className={`tree-item${isActive ? ' active' : ''}`}
                  style={{ paddingLeft: 10 }}
                  onClick={() => setSelectedNode(fileId)}
                  title={fileId}
                >
                  <span style={{ width: 12, flexShrink: 0 }} />
                  <span className="tree-item-icon">
                    <IconFile language={language} />
                  </span>
                  <span className="tree-item-name">{name}</span>
                  <span style={{ fontSize: 9.5, color: 'var(--text-muted)', marginLeft: 'auto', paddingLeft: 4, flexShrink: 0 }}>
                    {fileId.includes('/') ? fileId.split('/').slice(-2, -1)[0] : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {repoId && !search.trim() && (
          /* File tree */
          <div className="file-tree">
            {Object.entries(tree).map(([name, data]) => (
              <TreeNode
                key={name}
                name={name}
                data={data}
                depth={0}
                selectedFile={selectedFile}
                onSelect={setSelectedNode}
                langMap={langMap}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
