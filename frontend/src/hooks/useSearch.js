import { useState, useEffect, useCallback, useRef } from 'react'
import useRepoStore from '../store/repoStore'
import { searchRepo } from '../services/api'

/**
 * Hook for debounced search functionality
 */
export function useSearch(delay = 300) {
  const [localQuery, setLocalQuery] = useState('')
  const [scope, setScope] = useState('all')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState(null)
  const debounceTimer = useRef(null)

  const { repoId, setSearchQuery, setSearchResults, searchResults, searchQuery } = useRepoStore()

  /**
   * Perform the actual search
   */
  const performSearch = useCallback(
    async (query, searchScope) => {
      if (!repoId || !query.trim()) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      setError(null)
      try {
        const results = await searchRepo(repoId, query, searchScope)
        setSearchResults(Array.isArray(results) ? results : results?.results || [])
      } catch (err) {
        setError(err.message)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [repoId, setSearchResults]
  )

  /**
   * Handle query change with debounce
   */
  const handleQueryChange = useCallback(
    (query) => {
      setLocalQuery(query)
      setSearchQuery(query)

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      if (!query.trim()) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      debounceTimer.current = setTimeout(() => {
        performSearch(query, scope)
      }, delay)
    },
    [delay, scope, performSearch, setSearchQuery, setSearchResults]
  )

  /**
   * Handle scope change — re-run search with new scope
   */
  const handleScopeChange = useCallback(
    (newScope) => {
      setScope(newScope)
      if (localQuery.trim()) {
        performSearch(localQuery, newScope)
      }
    },
    [localQuery, performSearch]
  )

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setLocalQuery('')
    setSearchQuery('')
    setSearchResults([])
    setError(null)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
  }, [setSearchQuery, setSearchResults])

  /**
   * Keyboard shortcut handler (Ctrl+K)
   */
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  /**
   * Group results by type
   */
  const groupedResults = useCallback(() => {
    if (!searchResults?.length) return {}
    return searchResults.reduce((acc, result) => {
      const type = result.type || 'file'
      if (!acc[type]) acc[type] = []
      acc[type].push(result)
      return acc
    }, {})
  }, [searchResults])

  /**
   * Highlight matching text in a string
   */
  const highlightMatch = useCallback((text, query) => {
    if (!query || !text) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }, [])

  return {
    query: localQuery,
    scope,
    isSearching,
    error,
    results: searchResults,
    groupedResults: groupedResults(),
    handleQueryChange,
    handleScopeChange,
    clearSearch,
    highlightMatch,
  }
}

export default useSearch
