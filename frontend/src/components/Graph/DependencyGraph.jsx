import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { useRepoStore } from '../../store/repoStore'

/* ─────────────────────────────────────────────────────────────
   Node dimensions (boxy rectangles like ArchVision)
───────────────────────────────────────────────────────────── */
const NODE_W = 160
const NODE_H = 60
const NODE_RX = 6   // border-radius

/* ─────────────────────────────────────────────────────────────
   Per-language colour scheme — muted, professional
───────────────────────────────────────────────────────────── */
const LANG_COLOR = {
  javascript: { bg: '#1e2d45', border: '#4f8ef7', label: '#4f8ef7', badge: '#1d3461' },
  typescript: { bg: '#1a2b4a', border: '#60a5fa', label: '#60a5fa', badge: '#1d3461' },
  python:     { bg: '#1a3329', border: '#34d399', label: '#34d399', badge: '#1a3329' },
  java:       { bg: '#2d2010', border: '#fbbf24', label: '#fbbf24', badge: '#2d2010' },
  ruby:       { bg: '#2d1515', border: '#f87171', label: '#f87171', badge: '#2d1515' },
  go:         { bg: '#1a2d2d', border: '#2dd4bf', label: '#2dd4bf', badge: '#1a2d2d' },
  rust:       { bg: '#2d1e10', border: '#fb923c', label: '#fb923c', badge: '#2d1e10' },
  css:        { bg: '#21173d', border: '#c084fc', label: '#c084fc', badge: '#21173d' },
  scss:       { bg: '#21173d', border: '#e879f9', label: '#e879f9', badge: '#21173d' },
  html:       { bg: '#2d1a10', border: '#f97316', label: '#f97316', badge: '#2d1a10' },
  json:       { bg: '#1c222e', border: '#94a3b8', label: '#94a3b8', badge: '#1c222e' },
  vue:        { bg: '#142812', border: '#4ade80', label: '#4ade80', badge: '#142812' },
  markdown:   { bg: '#1c222e', border: '#64748b', label: '#64748b', badge: '#1c222e' },
  unknown:    { bg: '#1c222e', border: '#475569', label: '#8b95a7', badge: '#1c222e' },
}

/* Light mode colours */
const LANG_COLOR_LIGHT = {
  javascript: { bg: '#dbeafe', border: '#2563eb', label: '#1d4ed8', badge: '#bfdbfe' },
  typescript: { bg: '#e0f2fe', border: '#0284c7', label: '#0369a1', badge: '#bae6fd' },
  python:     { bg: '#dcfce7', border: '#16a34a', label: '#15803d', badge: '#bbf7d0' },
  java:       { bg: '#fef9c3', border: '#ca8a04', label: '#a16207', badge: '#fef08a' },
  ruby:       { bg: '#fee2e2', border: '#dc2626', label: '#b91c1c', badge: '#fecaca' },
  go:         { bg: '#ccfbf1', border: '#0d9488', label: '#0f766e', badge: '#99f6e4' },
  rust:       { bg: '#ffedd5', border: '#ea580c', label: '#c2410c', badge: '#fed7aa' },
  css:        { bg: '#f3e8ff', border: '#7c3aed', label: '#6d28d9', badge: '#e9d5ff' },
  scss:       { bg: '#fdf4ff', border: '#a21caf', label: '#86198f', badge: '#f5d0fe' },
  html:       { bg: '#ffedd5', border: '#c2410c', label: '#9a3412', badge: '#fed7aa' },
  json:       { bg: '#f1f5f9', border: '#64748b', label: '#475569', badge: '#e2e8f0' },
  vue:        { bg: '#f0fdf4', border: '#16a34a', label: '#15803d', badge: '#dcfce7' },
  markdown:   { bg: '#f8fafc', border: '#94a3b8', label: '#64748b', badge: '#e2e8f0' },
  unknown:    { bg: '#f1f5f9', border: '#94a3b8', label: '#64748b', badge: '#e2e8f0' },
}

function getLang(language, isDark) {
  const map = isDark ? LANG_COLOR : LANG_COLOR_LIGHT
  return map[language] || map.unknown
}

function shortName(path, name) {
  const n = name || path.split('/').pop()
  return n.length > 18 ? n.slice(0, 16) + '…' : n
}

function subLabel(node) {
  const parts = []
  if ((node.inDegree || 0) > 0)   parts.push(`${node.inDegree} dep`)
  if ((node.outDegree || 0) > 0)  parts.push(`${node.outDegree} import`)
  if (!parts.length && node.lines) return `${node.lines} lines`
  return parts.join(' · ')
}

function getRisk(c) {
  if (c <= 3)  return { label: 'Low',      color: '#22c55e' }
  if (c <= 7)  return { label: 'Moderate', color: '#f59e0b' }
  if (c <= 15) return { label: 'High',     color: '#f97316' }
  return           { label: 'Critical',    color: '#ef4444' }
}

/* ─────────────────────────────────────────────────────────────
   Draw a single boxy node into a D3 <g> selection
───────────────────────────────────────────────────────────── */
function drawNode(gSel, isDark, circularSet) {
  gSel.each(function(d) {
    const g = d3.select(this)
    const lc = getLang(d.language, isDark)
    const isCirc = circularSet.has(d.id)
    const w = d._expanded ? NODE_W + 40 : NODE_W
    const h = d._expanded ? NODE_H + 20 : NODE_H

    g.selectAll('*').remove()

    // Shadow rect (offset)
    g.append('rect')
      .attr('x', 2).attr('y', 2)
      .attr('width', w).attr('height', h)
      .attr('rx', NODE_RX)
      .attr('fill', isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)')

    // Main card rect
    g.append('rect')
      .attr('class', 'node-bg')
      .attr('width', w).attr('height', h)
      .attr('rx', NODE_RX)
      .attr('fill', isCirc ? (isDark ? '#2d1515' : '#fee2e2') : lc.bg)
      .attr('stroke', isCirc ? '#ef4444' : lc.border)
      .attr('stroke-width', d._selected ? 2 : 1)
      .attr('opacity', 1)

    // Selected highlight
    if (d._selected) {
      g.append('rect')
        .attr('width', w).attr('height', h)
        .attr('rx', NODE_RX)
        .attr('fill', 'none')
        .attr('stroke', lc.border)
        .attr('stroke-width', 2.5)
        .attr('opacity', 0.6)
    }

    // File name
    g.append('text')
      .attr('x', 12).attr('y', 22)
      .attr('font-size', 12.5)
      .attr('font-weight', 600)
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('fill', lc.label)
      .attr('pointer-events', 'none')
      .text(shortName(d.path, d.name))

    // Sub label (deps / imports)
    g.append('text')
      .attr('x', 12).attr('y', 40)
      .attr('font-size', 10.5)
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('fill', isDark ? '#4b5568' : '#9ca3af')
      .attr('pointer-events', 'none')
      .text(subLabel(d))

    // Complexity badge (top-right corner)
    if (d.avgComplexity && d.avgComplexity > 3) {
      const risk = getRisk(d.avgComplexity)
      const bx = w - 32
      g.append('rect')
        .attr('x', bx).attr('y', 8)
        .attr('width', 22).attr('height', 16)
        .attr('rx', 3)
        .attr('fill', risk.color + '22')
      g.append('text')
        .attr('x', bx + 11).attr('y', 19)
        .attr('font-size', 9.5)
        .attr('font-weight', 700)
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('fill', risk.color)
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text(Math.round(d.avgComplexity))
    }

    // Expand indicator (bottom-right)
    if (d._canDrillDown) {
      g.append('text')
        .attr('x', w - 10).attr('y', h - 6)
        .attr('font-size', 9)
        .attr('fill', isDark ? '#4b5568' : '#9ca3af')
        .attr('text-anchor', 'end')
        .attr('pointer-events', 'none')
        .text(d._expanded ? '▲ collapse' : '▼ expand')
    }

    // Circular dep indicator
    if (isCirc) {
      g.append('text')
        .attr('x', 12).attr('y', h - 6)
        .attr('font-size', 9)
        .attr('fill', '#ef4444')
        .attr('pointer-events', 'none')
        .text('⟲ circular')
    }
  })
}

/* ─────────────────────────────────────────────────────────────
   Tooltip component
───────────────────────────────────────────────────────────── */
function NodeTooltip({ node, x, y, isDark }) {
  if (!node) return null
  const lc = getLang(node.language, isDark)
  const risk = getRisk(node.avgComplexity || 1)

  const vpW = window.innerWidth
  const TW = 240
  const left = x + 14 + TW > vpW ? x - TW - 14 : x + 14
  const top = y + 10

  return (
    <div className="node-tooltip" style={{ left, top }}>
      <div className="tooltip-filename">
        {node.name || node.path.split('/').pop()}
      </div>
      <div className="tooltip-path">{node.path}</div>
      <div className="tooltip-stats">
        <div className="tooltip-stat">
          <div className="tooltip-stat-label">Lines</div>
          <div className="tooltip-stat-val" style={{ color: 'var(--text-primary)' }}>
            {node.lines || 0}
          </div>
        </div>
        <div className="tooltip-stat">
          <div className="tooltip-stat-label">Imports</div>
          <div className="tooltip-stat-val" style={{ color: lc.border }}>
            {node.outDegree || 0}
          </div>
        </div>
        <div className="tooltip-stat">
          <div className="tooltip-stat-label">CC</div>
          <div className="tooltip-stat-val" style={{ color: risk.color }}>
            {node.avgComplexity || 1}
          </div>
        </div>
      </div>
      {(node.functions || []).length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
            Functions
          </div>
          {node.functions.slice(0, 4).map((fn, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '1px 0', color: 'var(--text-secondary)' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                {fn.name}
              </span>
              <span style={{ color: getRisk(fn.complexity || 1).color, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                {fn.complexity || 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Zoom controls (floating panel, ArchVision-style)
───────────────────────────────────────────────────────────── */
function ZoomControls({ onZoomIn, onZoomOut, onFit, onReset }) {
  return (
    <div className="zoom-controls">
      <button className="zoom-btn" onClick={onZoomIn} title="Zoom in">+</button>
      <button className="zoom-btn" onClick={onZoomOut} title="Zoom out">−</button>
      <button className="zoom-btn" onClick={onFit} title="Fit to view" style={{ fontSize: 11 }}>⊡</button>
      <button className="zoom-btn" onClick={onReset} title="Reset layout" style={{ fontSize: 11 }}>↺</button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function DependencyGraph() {
  const svgRef  = useRef(null)
  const simRef  = useRef(null)
  const zoomRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const ttRef = useRef(null)
  const nodesRef = useRef([])

  const { graphData, selectedFile, setSelectedNode, graphSettings, circularData, theme } = useRepoStore()
  const circularSet = useMemo(
    () => new Set(circularData?.affectedFiles || []),
    [circularData]
  )
  const isDark = theme !== 'light'

  /* ── RENDER ─────────────────────────────────────────────────── */
  const render = useCallback(() => {
    if (!graphData || !svgRef.current) return
    const { nodes: rawNodes, edges: rawEdges } = graphData
    if (!rawNodes?.length) return

    // Filter by language if set
    const filtered = graphSettings.filterLanguage === 'all'
      ? rawNodes
      : rawNodes.filter(n => n.language === graphSettings.filterLanguage)
    const fIds  = new Set(filtered.map(n => n.id))
    const nodes = filtered.map(n => ({
      ...n,
      _selected: n.id === selectedFile,
      _canDrillDown: (n.functions || []).length > 0 || (n.importCount || 0) > 0,
      _expanded: false,
    }))
    const edges = rawEdges
      .filter(e => fIds.has(e.source?.id ?? e.source) && fIds.has(e.target?.id ?? e.target))
      .map(e => ({ ...e }))

    nodesRef.current = nodes

    const el = svgRef.current
    const W = el.clientWidth  || 960
    const H = el.clientHeight || 700

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
      .attr('width', W).attr('height', H)

    /* Defs: arrow markers */
    const defs = svg.append('defs')

    const mkMarker = (id, color) => {
      defs.append('marker').attr('id', id)
        .attr('viewBox', '0 -4 8 8').attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', color)
    }
    mkMarker('arr-default', isDark ? 'rgba(79,142,247,0.7)'  : 'rgba(37,99,235,0.6)')
    mkMarker('arr-circular', '#ef4444')
    mkMarker('arr-hover',   isDark ? '#4f8ef7' : '#2563eb')

    /* Zoom */
    const zoom = d3.zoom()
      .scaleExtent([0.05, 4])
      .filter(ev => ev.type === 'wheel' ? (ev.ctrlKey || ev.metaKey) : !ev.button)
      .on('zoom', ev => root.attr('transform', ev.transform))

    svg.call(zoom).on('dblclick.zoom', null)
    zoomRef.current = { zoom, svg, W, H }

    /* Background */
    svg.append('rect')
      .attr('width', W).attr('height', H)
      .attr('fill', isDark ? '#0f1117' : '#f0f2f5')
      .on('click', () => {
        nodes.forEach(n => { n.fx = null; n.fy = null })
        simRef.current?.alpha(0.1).restart()
      })

    const root = svg.append('g')

    /* ── EDGES ─────────────────────────────────────────────────── */
    const edgeLayer = root.append('g').attr('class', 'edge-layer')

    const edgePath = edgeLayer.selectAll('path')
      .data(edges).enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', d => {
        const sc = d.source?.id ?? d.source
        const tc = d.target?.id ?? d.target
        if (circularSet.has(sc) && circularSet.has(tc))
          return isDark ? 'rgba(239,68,68,0.6)' : 'rgba(220,38,38,0.5)'
        return isDark ? 'rgba(79,142,247,0.35)' : 'rgba(37,99,235,0.3)'
      })
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => {
        const sc = d.source?.id ?? d.source
        return circularSet.has(sc) ? '6 3' : null
      })
      .attr('marker-end', d => {
        const sc = d.source?.id ?? d.source
        const tc = d.target?.id ?? d.target
        return (circularSet.has(sc) && circularSet.has(tc))
          ? 'url(#arr-circular)'
          : 'url(#arr-default)'
      })
      .attr('opacity', 0.85)

    /* ── NODES ─────────────────────────────────────────────────── */
    const nodeLayer = root.append('g').attr('class', 'node-layer')

    const nodeEl = nodeLayer.selectAll('g.gnode')
      .data(nodes).enter().append('g')
      .attr('class', 'gnode')
      .style('cursor', 'pointer')

    /* Initial draw */
    drawNode(nodeEl, isDark, circularSet)

    /* Drag */
    nodeEl.call(
      d3.drag()
        .on('start', (ev, d) => {
          if (!ev.active) simRef.current?.alphaTarget(0.1).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y })
        .on('end', (ev, d) => {
          if (!ev.active) simRef.current?.alphaTarget(0)
        })
    )

    /* Click — select node and fly to it */
    nodeEl.on('click', (ev, d) => {
      ev.stopPropagation()
      // Toggle expansion on double-click area (bottom half of node)
      const [, ly] = d3.pointer(ev, ev.currentTarget)
      if (ly > NODE_H * 0.55 && d._canDrillDown) {
        d._expanded = !d._expanded
      } else {
        setSelectedNode(d.id)
        nodes.forEach(n => { n._selected = n.id === d.id })
        drawNode(nodeEl, isDark, circularSet)
        // Fly to node
        const k = d3.zoomTransform(el).k
        const tx = W / 2 - d.x * k
        const ty = H / 2 - d.y * k
        d3.select(el).transition().duration(500).ease(d3.easeCubicOut)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k))
      }
      drawNode(d3.select(ev.currentTarget), isDark, circularSet)
    })

    /* Hover */
    nodeEl
      .on('mouseover', (ev, d) => {
        clearTimeout(ttRef.current)
        ttRef.current = setTimeout(() => {
          setTooltip({ node: d, x: ev.clientX, y: ev.clientY })
        }, 60)

        // Highlight connected edges
        edgePath
          .attr('opacity', e => {
            const sc = e.source?.id ?? e.source
            const tc = e.target?.id ?? e.target
            return (sc === d.id || tc === d.id) ? 1 : 0.07
          })
          .attr('stroke-width', e => {
            const sc = e.source?.id ?? e.source
            const tc = e.target?.id ?? e.target
            return (sc === d.id || tc === d.id) ? 2 : 1
          })
          .attr('marker-end', e => {
            const sc = e.source?.id ?? e.source
            const tc = e.target?.id ?? e.target
            return (sc === d.id || tc === d.id) ? 'url(#arr-hover)' : 'url(#arr-default)'
          })

        // Dim unrelated nodes
        nodeEl.attr('opacity', n => {
          if (n.id === d.id) return 1
          const connected = edges.some(e => {
            const sc = e.source?.id ?? e.source
            const tc = e.target?.id ?? e.target
            return (sc === d.id && tc === n.id) || (tc === d.id && sc === n.id)
          })
          return connected ? 1 : 0.25
        })
      })
      .on('mousemove', ev => {
        setTooltip(p => p ? { ...p, x: ev.clientX, y: ev.clientY } : null)
      })
      .on('mouseout', () => {
        clearTimeout(ttRef.current)
        setTooltip(null)
        edgePath
          .attr('opacity', 0.85)
          .attr('stroke-width', 1.5)
          .attr('marker-end', d => {
            const sc = d.source?.id ?? d.source
            const tc = d.target?.id ?? d.target
            return (circularSet.has(sc) && circularSet.has(tc))
              ? 'url(#arr-circular)'
              : 'url(#arr-default)'
          })
        nodeEl.attr('opacity', 1)
      })

    /* ── FORCE SIMULATION ──────────────────────────────────────── */
    const sim = d3.forceSimulation(nodes)
      .alphaDecay(0.04)
      .velocityDecay(0.5)
      .force('link', d3.forceLink(edges).id(d => d.id)
        .distance(() => NODE_W * 1.4 + 20)
        .strength(0.4)
      )
      .force('charge', d3.forceManyBody()
        .strength(-600)
        .distanceMax(500)
      )
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.05))
      .force('collision', d3.forceCollide()
        .radius(() => Math.hypot(NODE_W / 2 + 10, NODE_H / 2 + 10))
        .strength(0.85)
        .iterations(4)
      )
      .force('bound', () => {
        const pad = 80
        nodes.forEach(n => {
          if (n.x < pad)       n.vx += (pad - n.x) * 0.07
          if (n.x > W - pad)   n.vx += (W - pad - n.x) * 0.07
          if (n.y < pad)       n.vy += (pad - n.y) * 0.07
          if (n.y > H - pad)   n.vy += (H - pad - n.y) * 0.07
        })
      })

    simRef.current = sim

    /* Tick — orthogonal/curved edges, move nodes */
    sim.on('tick', () => {
      edgePath.attr('d', d => {
        // Source node centre → target node centre
        const sx = d.source.x + NODE_W / 2
        const sy = d.source.y + NODE_H / 2
        const tx = d.target.x + NODE_W / 2
        const ty = d.target.y + NODE_H / 2

        // Clamp to node edges
        const fromX = d.source.x + NODE_W / 2
        const fromY = d.source.y + NODE_H / 2
        const toX   = d.target.x + NODE_W / 2
        const toY   = d.target.y + NODE_H / 2

        // Smooth curve (cubic bezier, ArchVision-style)
        const dx = toX - fromX
        const dy = toY - fromY
        const mx = fromX + dx * 0.5
        return `M${fromX},${fromY} C${mx},${fromY} ${mx},${toY} ${toX},${toY}`
      })

      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    /* Auto-fit when simulation settles */
    sim.on('end', () => {
      try {
        const rootNode = root.node()
        if (!rootNode) return
        const b = rootNode.getBBox()
        if (!b.width || !b.height) return
        const s = Math.min(0.88, Math.min((W - 80) / b.width, (H - 80) / b.height))
        const tx = (W - b.width * s) / 2 - b.x * s
        const ty = (H - b.height * s) / 2 - b.y * s
        d3.select(el).transition().duration(600).ease(d3.easeCubicInOut)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(s))
      } catch (_) {}
    })

  }, [graphData, graphSettings, selectedFile, circularSet, setSelectedNode, isDark])

  useEffect(() => { render() }, [render])

  /* Re-draw on resize */
  useEffect(() => {
    const ro = new ResizeObserver(() => render())
    if (svgRef.current?.parentElement) ro.observe(svgRef.current.parentElement)
    return () => ro.disconnect()
  }, [render])

  /* ── ZOOM CONTROLS ──────────────────────────────────────────── */
  const handleZoomIn = () => {
    if (!zoomRef.current) return
    const { zoom, svg } = zoomRef.current
    svg.transition().duration(250).call(zoom.scaleBy, 1.4)
  }
  const handleZoomOut = () => {
    if (!zoomRef.current) return
    const { zoom, svg } = zoomRef.current
    svg.transition().duration(250).call(zoom.scaleBy, 0.7)
  }
  const handleFit = () => {
    if (!svgRef.current || !zoomRef.current) return
    const { zoom, svg, W, H } = zoomRef.current
    const root = svg.select('g')
    try {
      const b = root.node().getBBox()
      if (!b.width || !b.height) return
      const s = Math.min(0.9, Math.min((W - 60) / b.width, (H - 60) / b.height))
      const tx = (W - b.width * s) / 2 - b.x * s
      const ty = (H - b.height * s) / 2 - b.y * s
      svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(s))
    } catch (_) {}
  }
  const handleReset = () => {
    if (simRef.current) {
      nodesRef.current.forEach(n => { n.fx = null; n.fy = null })
      simRef.current.alpha(0.5).restart()
    }
  }

  /* ── EMPTY STATE ────────────────────────────────────────────── */
  if (!graphData) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', flexDirection: 'column', gap: 12,
        color: 'var(--text-muted)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--r)',
          background: 'var(--accent-dim)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>⬡</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Dependency Graph
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>
          Enter a GitHub repository URL above to visualise its dependency graph
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        style={{
          display: 'block', width: '100%', height: '100%',
          cursor: 'grab',
        }}
      />
      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
        onReset={handleReset}
      />
      {tooltip && (
        <NodeTooltip
          node={tooltip.node}
          x={tooltip.x}
          y={tooltip.y}
          isDark={isDark}
        />
      )}
      <div style={{
        position: 'absolute', bottom: 10, right: 14,
        fontSize: 10.5, color: 'var(--text-muted)',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        Ctrl+Scroll to zoom · Drag nodes to pin · Click background to unpin
      </div>
    </div>
  )
}
