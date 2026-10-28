import { create } from 'zustand'
import * as api from '../services/api'

const LOADING_STAGES = [
  'Ingesting repository from GitHub…',
  'Parsing Abstract Syntax Trees…',
  'Building dependency graph…',
  'Scoring architectural health…',
  'Generating onboarding pathways…',
  'Ready to explore!',
]

export const useRepoStore = create((set, get) => ({
  // ── Repo state ──────────────────────────────────────────────────────────
  repoUrl: '',
  repoId: null,
  repoMeta: null,
  fileTree: [],
  selectedFile: null,
  selectedFileContent: null,

  // ── Analysis data ───────────────────────────────────────────────────────
  graphData: null,
  healthData: null,
  complexityData: null,
  circularData: null,
  onboardingData: null,
  heatmapData: null,
  searchResults: [],
  searchQuery: '',

  // ── UI state ─────────────────────────────────────────────────────────────
  isLoading: false,
  loadingStage: '',
  error: null,
  viewMode: 'graph', // 'graph' | 'health' | 'onboarding'
  theme: 'dark',     // 'dark' | 'light'

  // ── Graph settings ────────────────────────────────────────────────────────
  graphSettings: {
    showHeatmap: false,
    showClusters: true,
    showLabels: true,
    filterLanguage: 'all',
    layoutType: 'force',
    nodeSizeBy: 'complexity',
    highlightCircular: true,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  setRepoUrl: (url) => set({ repoUrl: url }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setError: (error) => set({ error }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  setSelectedNode: async (nodeId) => {
    // Allow null to clear selection
    if (!nodeId) {
      set({ selectedFile: null, selectedFileContent: null })
      return
    }
    const { repoId } = get()
    if (!repoId) return
    set({ selectedFile: nodeId, selectedFileContent: null })
    try {
      const data = await api.getFileContent(repoId, nodeId)
      set({ selectedFileContent: data })
    } catch (err) {
      console.error('Failed to load file content:', err)
    }
  },

  updateGraphSettings: (updates) =>
    set((state) => ({ graphSettings: { ...state.graphSettings, ...updates } })),

  setSearchQuery: (q) => set({ searchQuery: q }),

  searchRepo: async (query) => {
    const { repoId } = get()
    if (!repoId || !query.trim()) {
      set({ searchResults: [] })
      return
    }
    try {
      const results = await api.searchRepo(repoId, query)
      set({ searchResults: results.results || [] })
    } catch (err) {
      console.error('Search error:', err)
      set({ searchResults: [] })
    }
  },

  ingestRepo: async (url) => {
    const targetUrl = url || get().repoUrl
    if (!targetUrl.trim()) return

    set({ isLoading: true, error: null, loadingStage: LOADING_STAGES[0] })

    try {
      // Stage 1: ingest
      const ingestData = await api.ingestRepo(targetUrl)
      const repoId = ingestData.repoId

      set({ repoId, repoMeta: ingestData.metadata, loadingStage: LOADING_STAGES[1] })

      // Stage 2-3: graph (triggers ast parsing on backend)
      const [graphData, fileTree] = await Promise.all([
        api.getDependencyGraph(repoId),
        api.getRepoTree(repoId),
      ])
      set({ graphData, fileTree: fileTree.tree || [], loadingStage: LOADING_STAGES[3] })

      // Stage 4: health
      const healthData = await api.getHealthMetrics(repoId)
      set({ healthData, loadingStage: LOADING_STAGES[4] })

      // Stage 5: onboarding + circular (parallel, non-blocking)
      const [circularData, onboardingData] = await Promise.all([
        api.getCircularDeps(repoId),
        api.getOnboardingData(repoId),
      ])
      set({ circularData, onboardingData, loadingStage: LOADING_STAGES[5] })

      set({ isLoading: false, viewMode: 'graph' })
    } catch (err) {
      console.error('Ingest error:', err)
      set({
        isLoading: false,
        error: err.message || 'Failed to analyse repository.',
      })
    }
  },

  reset: () =>
    set({
      repoUrl: '',
      repoId: null,
      repoMeta: null,
      fileTree: [],
      selectedFile: null,
      selectedFileContent: null,
      graphData: null,
      healthData: null,
      complexityData: null,
      circularData: null,
      onboardingData: null,
      heatmapData: null,
      searchResults: [],
      searchQuery: '',
      isLoading: false,
      loadingStage: '',
      error: null,
      viewMode: 'graph',
    }),
}))
