import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min — GitHub API can be slow
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor for unified error handling
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Unknown error'
    const enhanced = new Error(message)
    enhanced.status = err.response?.status
    enhanced.response = err.response
    return Promise.reject(enhanced)
  }
)

/** POST /api/repo/ingest */
export const ingestRepo = (url) => client.post('/repo/ingest', { url })

/** GET /api/repo/:repoId/tree */
export const getRepoTree = (repoId) => client.get(`/repo/${repoId}/tree`)

/** GET /api/repo/:repoId/file?path=... */
export const getFileContent = (repoId, filePath) =>
  client.get(`/repo/${repoId}/file`, { params: { path: filePath } })

/** GET /api/repo/list */
export const listRepos = () => client.get('/repo/list')

/** GET /api/analysis/:repoId/graph */
export const getDependencyGraph = (repoId) => client.get(`/analysis/${repoId}/graph`)

/** GET /api/analysis/:repoId/health */
export const getHealthMetrics = (repoId) => client.get(`/analysis/${repoId}/health`)

/** GET /api/analysis/:repoId/complexity */
export const getComplexity = (repoId) => client.get(`/analysis/${repoId}/complexity`)

/** GET /api/analysis/:repoId/circular */
export const getCircularDeps = (repoId) => client.get(`/analysis/${repoId}/circular`)

/** GET /api/analysis/:repoId/onboarding */
export const getOnboardingData = (repoId) => client.get(`/analysis/${repoId}/onboarding`)

/** GET /api/analysis/:repoId/search?q=... */
export const searchRepo = (repoId, query) =>
  client.get(`/analysis/${repoId}/search`, { params: { q: query } })

/** GET /api/analysis/:repoId/heatmap */
export const getHeatmapData = (repoId) => client.get(`/analysis/${repoId}/heatmap`)
