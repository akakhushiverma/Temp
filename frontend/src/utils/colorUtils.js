/**
 * Color utilities for RepoSketch
 * Maps languages, complexity, and other metrics to colors
 */

// Language color map
export const LANGUAGE_COLORS = {
  javascript: '#f0db4f',
  js: '#f0db4f',
  jsx: '#61dafb',
  typescript: '#3178c6',
  ts: '#3178c6',
  tsx: '#61dafb',
  python: '#3572A5',
  py: '#3572A5',
  rust: '#dea584',
  rs: '#dea584',
  go: '#00ADD8',
  java: '#b07219',
  kotlin: '#A97BFF',
  swift: '#ffac45',
  cpp: '#f34b7d',
  'c++': '#f34b7d',
  c: '#555555',
  csharp: '#239120',
  'c#': '#239120',
  ruby: '#CC342D',
  rb: '#CC342D',
  php: '#777BB4',
  html: '#e34c26',
  css: '#563d7c',
  scss: '#c6538c',
  sass: '#a53b70',
  vue: '#41b883',
  svelte: '#ff3e00',
  markdown: '#083fa1',
  md: '#083fa1',
  json: '#f59e0b',
  yaml: '#cb171e',
  yml: '#cb171e',
  toml: '#9c4221',
  xml: '#0060ac',
  shell: '#89e051',
  sh: '#89e051',
  bash: '#89e051',
  zsh: '#89e051',
  dockerfile: '#384d54',
  graphql: '#e10098',
  gql: '#e10098',
  sql: '#e38c00',
  r: '#198CE7',
  scala: '#c22d40',
  elixir: '#6e4a7e',
  erlang: '#B83998',
  haskell: '#5e5086',
  unknown: '#6b7280',
  default: '#8b5cf6',
}

/**
 * Get color for a file language
 * @param {string} language
 * @returns {string} hex color
 */
export function getLanguageColor(language) {
  if (!language) return LANGUAGE_COLORS.default
  const key = language.toLowerCase().replace(/^\./, '')
  return LANGUAGE_COLORS[key] || LANGUAGE_COLORS.default
}

/**
 * Get language from file extension
 * @param {string} filename
 * @returns {string} language name
 */
export function getLanguageFromFilename(filename) {
  if (!filename) return 'unknown'
  const ext = filename.split('.').pop()?.toLowerCase()
  const extMap = {
    js: 'JavaScript',
    jsx: 'JavaScript',
    ts: 'TypeScript',
    tsx: 'TypeScript',
    py: 'Python',
    rs: 'Rust',
    go: 'Go',
    java: 'Java',
    kt: 'Kotlin',
    swift: 'Swift',
    cpp: 'C++',
    cc: 'C++',
    c: 'C',
    cs: 'C#',
    rb: 'Ruby',
    php: 'PHP',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'SCSS',
    vue: 'Vue',
    svelte: 'Svelte',
    md: 'Markdown',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    toml: 'TOML',
    xml: 'XML',
    sh: 'Shell',
    bash: 'Shell',
    zsh: 'Shell',
    dockerfile: 'Dockerfile',
    graphql: 'GraphQL',
    gql: 'GraphQL',
    sql: 'SQL',
    r: 'R',
    scala: 'Scala',
    ex: 'Elixir',
    exs: 'Elixir',
    erl: 'Erlang',
    hs: 'Haskell',
  }
  return extMap[ext] || ext || 'Unknown'
}

// Complexity color scale (green → yellow → orange → red)
export const COMPLEXITY_COLORS = {
  low: '#10b981',      // green  (1-5)
  medium: '#f59e0b',   // gold   (6-10)
  high: '#f97316',     // orange (11-20)
  critical: '#ef4444', // red    (21+)
}

/**
 * Get color for a complexity score
 * @param {number} complexity
 * @returns {string} hex color
 */
export function getComplexityColor(complexity) {
  if (!complexity || complexity <= 5) return COMPLEXITY_COLORS.low
  if (complexity <= 10) return COMPLEXITY_COLORS.medium
  if (complexity <= 20) return COMPLEXITY_COLORS.high
  return COMPLEXITY_COLORS.critical
}

/**
 * Get complexity label
 * @param {number} complexity
 * @returns {string}
 */
export function getComplexityLabel(complexity) {
  if (!complexity || complexity <= 5) return 'Low'
  if (complexity <= 10) return 'Medium'
  if (complexity <= 20) return 'High'
  return 'Critical'
}

// Health score color (red → orange → yellow → green)
export function getHealthColor(score) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

// Heatmap color scale
export function getHeatmapColor(value, min = 0, max = 100) {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)))
  // Cool blue → hot red heatmap
  if (normalized < 0.25) {
    const t = normalized / 0.25
    return interpolateColor('#06b6d4', '#3b82f6', t)
  } else if (normalized < 0.5) {
    const t = (normalized - 0.25) / 0.25
    return interpolateColor('#3b82f6', '#8b5cf6', t)
  } else if (normalized < 0.75) {
    const t = (normalized - 0.5) / 0.25
    return interpolateColor('#8b5cf6', '#f59e0b', t)
  } else {
    const t = (normalized - 0.75) / 0.25
    return interpolateColor('#f59e0b', '#ef4444', t)
  }
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1, 3), 16)
  const g1 = parseInt(hex1.slice(3, 5), 16)
  const b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16)
  const g2 = parseInt(hex2.slice(3, 5), 16)
  const b2 = parseInt(hex2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Add alpha to a hex color
 */
export function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Blast radius severity colors
export const SEVERITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
}

export function getSeverityColor(severity) {
  return SEVERITY_COLORS[severity?.toLowerCase()] || SEVERITY_COLORS.medium
}

// Directory cluster colors (cycled through)
export const CLUSTER_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981',
  '#ec4899', '#f97316', '#3b82f6', '#84cc16',
  '#e11d48', '#0ea5e9', '#d946ef', '#22c55e',
]

export function getClusterColor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length]
}
