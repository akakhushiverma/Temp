import { useState, useEffect, useCallback } from 'react'
import { useRepoStore } from '../../store/repoStore'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const { searchRepo, repoId } = useRepoStore()
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (repoId && debouncedQuery.trim().length > 1) {
      searchRepo(debouncedQuery)
    }
  }, [debouncedQuery, repoId, searchRepo])

  // Ctrl+K to focus
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="search-bar">
      <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>🔍</span>
      <input
        id="search-input"
        className="search-input"
        type="text"
        placeholder="Search files, functions… (Ctrl+K)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={!repoId}
        aria-label="Search repository"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12 }}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
