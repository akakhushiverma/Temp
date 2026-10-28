import { useCallback } from 'react'
import useRepoStore from '../store/repoStore'
import { getFileContent, getRepoTree, getComplexityData } from '../services/api'

/**
 * Hook for repo ingestion and data fetching
 */
export function useRepo() {
  const {
    repoUrl,
    repoId,
    repoData,
    graphData,
    healthData,
    onboardingData,
    selectedFile,
    isLoading,
    loadingStage,
    error,
    setRepoUrl,
    ingestRepo: storeIngestRepo,
    selectFile,
    clearError,
    reset,
  } = useRepoStore()

  /**
   * Trigger repository ingestion
   */
  const analyzeRepo = useCallback(
    async (url) => {
      const target = url || repoUrl
      if (!target.trim()) return
      await storeIngestRepo(target)
    },
    [repoUrl, storeIngestRepo]
  )

  /**
   * Fetch file content for the selected file
   */
  const fetchFileContent = useCallback(
    async (filePath) => {
      if (!repoId || !filePath) return null
      try {
        const data = await getFileContent(repoId, filePath)
        return data
      } catch (err) {
        console.error('Failed to fetch file content:', err)
        return null
      }
    },
    [repoId]
  )

  /**
   * Fetch repo file tree
   */
  const fetchRepoTree = useCallback(async () => {
    if (!repoId) return null
    try {
      const tree = await getRepoTree(repoId)
      return tree
    } catch (err) {
      console.error('Failed to fetch repo tree:', err)
      return null
    }
  }, [repoId])

  /**
   * Fetch complexity data for all files
   */
  const fetchComplexity = useCallback(async () => {
    if (!repoId) return null
    try {
      const data = await getComplexityData(repoId)
      return data
    } catch (err) {
      console.error('Failed to fetch complexity data:', err)
      return null
    }
  }, [repoId])

  /**
   * Get summary metrics from loaded data
   */
  const getSummaryMetrics = useCallback(() => {
    if (!graphData) return null
    const nodes = graphData.nodes || []
    const links = graphData.links || []
    return {
      totalFiles: nodes.length,
      totalDependencies: links.length,
      circularDeps: links.filter((l) => l.type === 'circular').length,
      healthScore: healthData?.score ?? null,
      languages: [...new Set(nodes.map((n) => n.language).filter(Boolean))],
    }
  }, [graphData, healthData])

  /**
   * Check if a repo is loaded
   */
  const isLoaded = Boolean(repoId && graphData)

  /**
   * Extract repo name from URL
   */
  const getRepoName = useCallback(() => {
    if (!repoUrl) return null
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)
    return match ? match[1] : repoUrl
  }, [repoUrl])

  return {
    // State
    repoUrl,
    repoId,
    repoData,
    graphData,
    healthData,
    onboardingData,
    selectedFile,
    isLoading,
    loadingStage,
    error,
    isLoaded,

    // Actions
    setRepoUrl,
    analyzeRepo,
    selectFile,
    clearError,
    reset,

    // Data fetchers
    fetchFileContent,
    fetchRepoTree,
    fetchComplexity,

    // Computed
    getSummaryMetrics,
    getRepoName,
  }
}

export default useRepo
