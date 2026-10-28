import { useRepoStore } from '../../store/repoStore'

const TYPE_ICONS = { file: '📄', function: 'ƒ', class: '◆' }
const TYPE_COLORS = {
  file: 'var(--color-cyan)',
  function: 'var(--color-purple-light)',
  class: 'var(--color-gold)',
}

export default function SearchResults() {
  const { searchResults, searchQuery, setSelectedNode } = useRepoStore()

  if (!searchQuery || searchResults.length === 0) {
    if (searchQuery) {
      return <div className="no-data" style={{ fontSize: 12, padding: 12 }}>No results for "{searchQuery}"</div>
    }
    return null
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
      </div>
      {searchResults.map((result, i) => (
        <div
          key={i}
          className="search-result-item"
          onClick={() => setSelectedNode(result.path)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedNode(result.path)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ color: TYPE_COLORS[result.type], fontSize: 12, fontWeight: 700 }}>
              {TYPE_ICONS[result.type]}
            </span>
            <span className="search-result-type" style={{ color: TYPE_COLORS[result.type] }}>
              {result.type}
            </span>
            {result.complexity && (
              <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                cc:{result.complexity}
              </span>
            )}
          </div>
          <div className="search-result-name">
            {result.name || result.path.split('/').pop()}
          </div>
          <div className="search-result-path">{result.path}</div>
          {result.line && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Line {result.line}</div>
          )}
        </div>
      ))}
    </div>
  )
}
