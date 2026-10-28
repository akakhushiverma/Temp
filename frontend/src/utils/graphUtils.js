import * as d3 from 'd3'
import { getLanguageColor, getHeatmapColor, hexWithAlpha, getClusterColor } from './colorUtils'

/**
 * Compute node radius based on sizing mode
 */
export function getNodeRadius(node, nodeSizeBy = 'connections', scale = 1) {
  const base = 6
  let size = base
  switch (nodeSizeBy) {
    case 'complexity':
      size = base + Math.min((node.complexity || 1) * 0.8, 20)
      break
    case 'connections':
      size = base + Math.min((node.connections || 0) * 0.5, 20)
      break
    case 'lines':
      size = base + Math.min((node.lines || 0) * 0.015, 20)
      break
    default:
      size = base + Math.min((node.connections || 0) * 0.5, 20)
  }
  return size * scale
}

/**
 * Get node fill color based on mode
 */
export function getNodeColor(node, showHeatmap = false, heatmapData = null) {
  if (showHeatmap && heatmapData) {
    const heat = heatmapData[node.id] ?? heatmapData[node.path] ?? 0
    return getHeatmapColor(heat)
  }
  return getLanguageColor(node.language || node.ext)
}

/**
 * Build adjacency map from links
 */
export function buildAdjacencyMap(nodes, links) {
  const map = new Map()
  nodes.forEach((n) => map.set(n.id, new Set()))
  links.forEach((l) => {
    const src = typeof l.source === 'object' ? l.source.id : l.source
    const tgt = typeof l.target === 'object' ? l.target.id : l.target
    if (map.has(src)) map.get(src).add(tgt)
    if (map.has(tgt)) map.get(tgt).add(src)
  })
  return map
}

/**
 * Compute connection count for each node
 */
export function computeConnections(nodes, links) {
  const counts = new Map()
  nodes.forEach((n) => counts.set(n.id, 0))
  links.forEach((l) => {
    const src = typeof l.source === 'object' ? l.source.id : l.source
    const tgt = typeof l.target === 'object' ? l.target.id : l.target
    counts.set(src, (counts.get(src) || 0) + 1)
    counts.set(tgt, (counts.get(tgt) || 0) + 1)
  })
  return counts
}

/**
 * Group nodes by directory (cluster)
 */
export function groupNodesByDirectory(nodes) {
  const groups = new Map()
  nodes.forEach((node) => {
    const dir = getDirectory(node.path || node.id)
    if (!groups.has(dir)) groups.set(dir, [])
    groups.get(dir).push(node)
  })
  return groups
}

function getDirectory(path) {
  if (!path) return 'root'
  const parts = path.replace(/\\/g, '/').split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : 'root'
}

/**
 * Compute convex hull paths for cluster overlays
 */
export function computeClusterHulls(groups, padding = 20) {
  const hulls = []
  let i = 0
  groups.forEach((nodes, dir) => {
    if (nodes.length < 3) {
      i++
      return
    }
    const points = nodes
      .filter((n) => n.x != null && n.y != null)
      .map((n) => [n.x, n.y])
    if (points.length < 3) { i++; return }
    const hull = d3.polygonHull(points)
    if (hull) {
      hulls.push({
        dir,
        path: hullPath(hull, padding),
        color: getClusterColor(i),
      })
    }
    i++
  })
  return hulls
}

function hullPath(hull, padding) {
  const n = hull.length
  if (n < 2) return ''
  const path = []
  for (let i = 0; i < n; i++) {
    const p0 = hull[(i - 1 + n) % n]
    const p1 = hull[i]
    const p2 = hull[(i + 1) % n]
    const dx0 = p1[0] - p0[0]; const dy0 = p1[1] - p0[1]
    const dx1 = p2[0] - p1[0]; const dy1 = p2[1] - p1[1]
    const l0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1
    const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1
    const ox = (-dy0 / l0 - dy1 / l1) * padding
    const oy = (dx0 / l0 + dx1 / l1) * padding
    path.push([p1[0] + ox, p1[1] + oy])
  }
  return 'M' + path.map((p) => p.join(',')).join('L') + 'Z'
}

/**
 * Filter graph data by language
 */
export function filterGraphByLanguage(graphData, language) {
  if (!graphData || language === 'all') return graphData
  const filteredNodes = graphData.nodes.filter(
    (n) => (n.language || '').toLowerCase() === language.toLowerCase()
  )
  const nodeIds = new Set(filteredNodes.map((n) => n.id))
  const filteredLinks = graphData.links.filter((l) => {
    const src = typeof l.source === 'object' ? l.source.id : l.source
    const tgt = typeof l.target === 'object' ? l.target.id : l.target
    return nodeIds.has(src) && nodeIds.has(tgt)
  })
  return { nodes: filteredNodes, links: filteredLinks }
}

/**
 * Build hierarchical layout positions
 */
export function buildHierarchicalLayout(nodes, links, width, height) {
  const graph = { nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) }
  // Assign layers via BFS from entry-point nodes
  const inDegree = new Map(nodes.map((n) => [n.id, 0]))
  links.forEach((l) => {
    const tgt = typeof l.target === 'object' ? l.target.id : l.target
    inDegree.set(tgt, (inDegree.get(tgt) || 0) + 1)
  })
  const roots = nodes.filter((n) => inDegree.get(n.id) === 0)
  const layers = new Map()
  const queue = roots.map((n) => ({ id: n.id, layer: 0 }))
  const visited = new Set()
  while (queue.length) {
    const { id, layer } = queue.shift()
    if (visited.has(id)) continue
    visited.add(id)
    layers.set(id, layer)
    links.forEach((l) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      if (src === id && !visited.has(tgt)) {
        queue.push({ id: tgt, layer: layer + 1 })
      }
    })
  }
  nodes.forEach((n) => { if (!layers.has(n.id)) layers.set(n.id, 0) })
  const maxLayer = Math.max(...layers.values(), 0)
  const layerGroups = new Map()
  layers.forEach((layer, id) => {
    if (!layerGroups.has(layer)) layerGroups.set(layer, [])
    layerGroups.get(layer).push(id)
  })
  const positions = new Map()
  layerGroups.forEach((ids, layer) => {
    const y = (layer / (maxLayer || 1)) * (height - 100) + 50
    ids.forEach((id, i) => {
      const x = ((i + 1) / (ids.length + 1)) * width
      positions.set(id, { x, y })
    })
  })
  return positions
}

/**
 * Build radial layout positions
 */
export function buildRadialLayout(nodes, width, height) {
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.min(width, height) / 2 - 60
  const positions = new Map()
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI
    const r = maxR * (0.3 + 0.7 * Math.random())
    positions.set(node.id, {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    })
  })
  return positions
}

/**
 * Get unique languages from nodes
 */
export function getUniqueLanguages(nodes) {
  const langs = new Set()
  nodes?.forEach((n) => {
    if (n.language) langs.add(n.language)
  })
  return Array.from(langs).sort()
}

/**
 * Find shortest path between two nodes (BFS)
 */
export function findShortestPath(nodes, links, fromId, toId) {
  const adj = buildAdjacencyMap(nodes, links)
  const visited = new Set([fromId])
  const queue = [[fromId]]
  while (queue.length) {
    const path = queue.shift()
    const last = path[path.length - 1]
    if (last === toId) return path
    for (const neighbor of (adj.get(last) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }
  return null
}

/**
 * Compute blast radius (files that import the given file)
 */
export function computeBlastRadius(nodeId, nodes, links, depth = 3) {
  const reverseAdj = new Map()
  nodes.forEach((n) => reverseAdj.set(n.id, new Set()))
  links.forEach((l) => {
    const src = typeof l.source === 'object' ? l.source.id : l.source
    const tgt = typeof l.target === 'object' ? l.target.id : l.target
    if (reverseAdj.has(tgt)) reverseAdj.get(tgt).add(src)
  })
  const affected = new Map()
  const queue = [{ id: nodeId, distance: 0 }]
  const visited = new Set([nodeId])
  while (queue.length) {
    const { id, distance } = queue.shift()
    if (distance > depth) continue
    for (const dep of (reverseAdj.get(id) || [])) {
      if (!visited.has(dep)) {
        visited.add(dep)
        const severity = distance === 0 ? 'high' : distance === 1 ? 'medium' : 'low'
        affected.set(dep, { severity, distance: distance + 1 })
        queue.push({ id: dep, distance: distance + 1 })
      }
    }
  }
  return affected
}
