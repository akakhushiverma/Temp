import { useState, useMemo } from 'react'
import { useRepoStore } from '../../store/repoStore'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

const LANG_MAP = {
  javascript: 'javascript', typescript: 'typescript', python: 'python',
  java: 'java', go: 'go', rust: 'rust', html: 'html', css: 'css',
  json: 'json', markdown: 'markdown', ruby: 'ruby', yaml: 'yaml', vue: 'javascript',
}

function getRisk(c) {
  if (c <= 3)  return { label: 'Low',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  if (c <= 7)  return { label: 'Moderate', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  if (c <= 15) return { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.12)' }
  return           { label: 'Critical',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 5H2M4.5 2.5L2 5l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CodePanel() {
  const { selectedFile, selectedFileContent, graphData, setSelectedNode, theme } = useRepoStore()
  const [tab, setTab] = useState('details')
  const isDark = theme !== 'light'

  const nodeData = useMemo(
    () => graphData?.nodes?.find(n => n.id === selectedFile),
    [graphData, selectedFile]
  )

  /* ── Empty state ─────────────────────────────────────────── */
  if (!selectedFile) {
    return (
      <div className="code-panel">
        <div className="code-panel-header">
          <div className="code-panel-title">
            Code Inspector &amp; Dependencies
          </div>
        </div>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon">👈</div>
          <div className="empty-state-text">
            Click a node in the graph<br />or a file in the explorer
          </div>
        </div>
      </div>
    )
  }

  if (!selectedFileContent && !nodeData) {
    return (
      <div className="code-panel">
        <div className="code-panel-header">
          <div className="code-panel-title">
            Code Inspector &amp; Dependencies
          </div>
          <div className="code-panel-subtitle">{selectedFile}</div>
        </div>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <div className="empty-state-text">Loading file…</div>
        </div>
      </div>
    )
  }

  const { content, language, tokens, lines } = selectedFileContent || {}
  const functions = nodeData?.functions || []
  const avgComplexity = nodeData?.avgComplexity || 1
  const risk = getRisk(avgComplexity)
  const syntaxLang = LANG_MAP[language] || 'text'
  const filename = selectedFile.split('/').pop()

  const imports = (graphData?.edges || []).filter(e => e.source === selectedFile)
  const exports = (graphData?.edges || []).filter(e => e.target === selectedFile)

  return (
    <div className="code-panel">
      {/* Header — matches ArchVision "Code Inspector & Dependencies" */}
      <div className="code-panel-header">
        <div className="code-panel-title">
          <span>Code Inspector &amp; Dependencies</span>
          <button
            className="code-panel-close"
            onClick={() => setSelectedNode(null)}
            title="Close panel"
            aria-label="Close panel"
          >
            <IconClose />
          </button>
        </div>
        <div className="code-panel-subtitle">
          {selectedFile.includes('/')
            ? `File-level · ${lines || '—'} lines${tokens ? ` · ${Math.round(tokens / 1000)}k tokens` : ''} · ${functions.length} functions`
            : filename
          }
        </div>
      </div>

      {/* Tabs: Details / Imports / Exports */}
      <div className="panel-tabs">
        {[
          { id: 'details', label: 'Details' },
          { id: 'imports', label: `Imports${imports.length ? ` (${imports.length})` : ''}` },
          { id: 'exports', label: `Exports${exports.length ? ` (${exports.length})` : ''}` },
        ].map(t => (
          <button
            key={t.id}
            className={`panel-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="code-panel-body">

        {/* ── DETAILS TAB ── */}
        {tab === 'details' && (
          <>
            {/* Metrics */}
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              {[
                { label: 'Language', value: language || '—', color: 'var(--accent)' },
                { label: 'Lines',    value: lines || 0,       color: 'var(--text-primary)' },
                { label: 'Tokens',   value: tokens ? tokens.toLocaleString() : '—', color: 'var(--text-primary)' },
                { label: 'In-edges', value: nodeData?.inDegree || 0,  color: '#22c55e' },
                { label: 'Out-edges',value: nodeData?.outDegree || 0, color: '#f59e0b' },
              ].map(m => (
                <div key={m.label} className="metric-row">
                  <span className="metric-label">{m.label}</span>
                  <span className="metric-value" style={{ color: m.color }}>{m.value}</span>
                </div>
              ))}
              {/* Complexity row with badge */}
              <div className="metric-row">
                <span className="metric-label">Complexity</span>
                <span className="metric-value">{avgComplexity}</span>
                <span
                  className="metric-badge"
                  style={{ background: risk.bg, color: risk.color, marginLeft: 8 }}
                >
                  {risk.label}
                </span>
              </div>
            </div>

            {/* Functions */}
            {functions.length > 0 && (
              <>
                <div className="section-header">Functions ({functions.length})</div>
                {functions.slice(0, 12).map((fn, i) => {
                  const fr = getRisk(fn.complexity || 1)
                  return (
                    <div key={i} className="fn-item">
                      <span className="fn-glyph">ƒ</span>
                      <span className="fn-name" title={fn.name}>{fn.name}</span>
                      <span
                        className="fn-cc"
                        style={{ background: fr.bg, color: fr.color }}
                      >
                        {fn.complexity || 1}
                      </span>
                      {fn.startLine && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
                          L{fn.startLine}
                        </span>
                      )}
                    </div>
                  )
                })}
                {functions.length > 12 && (
                  <div style={{ padding: '4px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                    +{functions.length - 12} more functions
                  </div>
                )}
              </>
            )}

            {/* Source code */}
            {content && (
              <>
                <div className="section-header">Source</div>
                <div style={{ overflow: 'auto' }}>
                  <SyntaxHighlighter
                    language={syntaxLang}
                    style={isDark ? vscDarkPlus : oneLight}
                    showLineNumbers
                    lineNumberStyle={{
                      color: 'var(--text-muted)',
                      fontSize: 10.5,
                      userSelect: 'none',
                      minWidth: '2.5em',
                    }}
                    customStyle={{
                      margin: 0,
                      padding: '10px 0',
                      background: 'transparent',
                      fontSize: 11.5,
                      lineHeight: 1.65,
                    }}
                    codeTagProps={{ style: { fontFamily: 'var(--mono)' } }}
                  >
                    {content || '// Empty file'}
                  </SyntaxHighlighter>
                </div>
              </>
            )}
          </>
        )}

        {/* ── IMPORTS TAB ── */}
        {tab === 'imports' && (
          <>
            <div className="section-header" style={{ borderTop: 'none', paddingTop: 10 }}>
              Files this module imports ({imports.length})
            </div>
            {imports.length === 0 && (
              <div className="empty-state" style={{ paddingTop: 24 }}>
                <div className="empty-state-text">No imports detected</div>
              </div>
            )}
            {imports.map((edge, i) => {
              const target = edge.target
              const name = target.split('/').pop()
              return (
                <div key={i} className="dep-item" onClick={() => setSelectedNode(target)}>
                  <span className="dep-arrow" style={{ color: 'var(--accent)' }}>
                    <IconArrowRight />
                  </span>
                  <span className="dep-name">{name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>
                    {target.includes('/')
                      ? target.split('/').slice(-2).join('/')
                      : target}
                  </span>
                </div>
              )
            })}
          </>
        )}

        {/* ── EXPORTS TAB ── */}
        {tab === 'exports' && (
          <>
            <div className="section-header" style={{ borderTop: 'none', paddingTop: 10 }}>
              Files that import this module ({exports.length})
            </div>
            {exports.length === 0 && (
              <div className="empty-state" style={{ paddingTop: 24 }}>
                <div className="empty-state-text">No dependents found</div>
              </div>
            )}
            {exports.map((edge, i) => {
              const source = edge.source
              const name = source.split('/').pop()
              return (
                <div key={i} className="dep-item" onClick={() => setSelectedNode(source)}>
                  <span className="dep-arrow" style={{ color: '#22c55e' }}>
                    <IconArrowLeft />
                  </span>
                  <span className="dep-name">{name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>
                    {source.includes('/')
                      ? source.split('/').slice(-2).join('/')
                      : source}
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
