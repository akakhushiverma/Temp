import { useRef, useCallback } from 'react'
import useRepoStore from '../store/repoStore'

/**
 * Hook for D3 graph state management and interaction
 */
export function useGraph() {
  const simulationRef = useRef(null)
  const zoomRef = useRef(null)
  const svgRef = useRef(null)

  const {
    graphData,
    graphSettings,
    selectedNode,
    updateGraphSettings,
    setGraphZoom,
  } = useRepoStore()

  /**
   * Stop the running simulation
   */
  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop()
    }
  }, [])

  /**
   * Restart the simulation with higher alpha
   */
  const restartSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.5).restart()
    }
  }, [])

  /**
   * Reset zoom to fit the full graph
   */
  const resetZoom = useCallback(() => {
    if (zoomRef.current && svgRef.current) {
      const svg = svgRef.current
      const zoom = zoomRef.current
      svg.transition().duration(500).call(zoom.transform, d3Identity())
    }
  }, [])

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    if (zoomRef.current && svgRef.current) {
      zoomRef.current.scaleBy(svgRef.current.transition().duration(200), 1.3)
    }
  }, [])

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    if (zoomRef.current && svgRef.current) {
      zoomRef.current.scaleBy(svgRef.current.transition().duration(200), 0.77)
    }
  }, [])

  /**
   * Toggle heatmap overlay
   */
  const toggleHeatmap = useCallback(() => {
    updateGraphSettings({ showHeatmap: !graphSettings.showHeatmap })
  }, [graphSettings.showHeatmap, updateGraphSettings])

  /**
   * Toggle cluster view
   */
  const toggleClusters = useCallback(() => {
    updateGraphSettings({ showClusters: !graphSettings.showClusters })
  }, [graphSettings.showClusters, updateGraphSettings])

  /**
   * Set language filter
   */
  const setFilterLanguage = useCallback((lang) => {
    updateGraphSettings({ filterLanguage: lang })
  }, [updateGraphSettings])

  /**
   * Set layout type
   */
  const setLayoutType = useCallback((layout) => {
    updateGraphSettings({ layoutType: layout })
  }, [updateGraphSettings])

  /**
   * Set node size metric
   */
  const setNodeSizeBy = useCallback((metric) => {
    updateGraphSettings({ nodeSizeBy: metric })
  }, [updateGraphSettings])

  /**
   * Get stats from graph data
   */
  const getGraphStats = useCallback(() => {
    if (!graphData) return null
    return {
      nodeCount: graphData.nodes?.length || 0,
      linkCount: graphData.links?.length || 0,
      circularCount: graphData.links?.filter((l) => l.type === 'circular').length || 0,
    }
  }, [graphData])

  return {
    simulationRef,
    zoomRef,
    svgRef,
    stopSimulation,
    restartSimulation,
    resetZoom,
    zoomIn,
    zoomOut,
    toggleHeatmap,
    toggleClusters,
    setFilterLanguage,
    setLayoutType,
    setNodeSizeBy,
    getGraphStats,
    graphSettings,
    selectedNode,
  }
}

// Helper to avoid importing d3 just for identity transform
function d3Identity() {
  // Lazy import pattern - the actual D3 zoom identity
  return { k: 1, x: 0, y: 0 }
}

export default useGraph
