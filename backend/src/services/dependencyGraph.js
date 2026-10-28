'use strict';

const path = require('path');

/**
 * Resolve a relative import from a source file to an absolute repo path.
 * e.g. sourceFile = "src/components/App.js", importPath = "../utils/helper"
 * → "src/utils/helper"
 */
function resolveImport(sourceFile, importPath) {
  if (!importPath.startsWith('.')) return null; // external package

  const sourceDir = path.dirname(sourceFile).replace(/\\/g, '/');
  const resolved = path.join(sourceDir, importPath).replace(/\\/g, '/');
  return resolved;
}

/**
 * Try to find the actual file path that matches a resolved import.
 * Handles extension omission (e.g., ./utils → ./utils.js, ./utils/index.js).
 */
function findMatchingFile(resolved, filePathSet) {
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte'];
  const indexFiles = extensions.map((e) => `${resolved}/index${e}`);
  const withExt = extensions.map((e) => `${resolved}${e}`);
  const candidates = [resolved, ...withExt, ...indexFiles];

  for (const candidate of candidates) {
    if (filePathSet.has(candidate)) return candidate;
    // Also try without leading ./
    const stripped = candidate.replace(/^\.\//, '');
    if (filePathSet.has(stripped)) return stripped;
  }
  return null;
}

/**
 * Determine language category for cluster coloring.
 */
function getLanguageColor(language) {
  const colors = {
    javascript: '#f7df1e',
    typescript: '#3178c6',
    python: '#3572a5',
    java: '#b07219',
    ruby: '#701516',
    go: '#00add8',
    rust: '#dea584',
    html: '#e34c26',
    css: '#563d7c',
    json: '#888',
    markdown: '#ccc',
    unknown: '#aaa',
  };
  return colors[language] || '#aaa';
}

/**
 * Build a force-directed graph data structure from parsed files.
 *
 * @param {Array<{path, language, content, size, parsed}>} parsedFiles
 * @returns {{ nodes: [], edges: [], clusters: [], stats: {} }}
 */
function buildGraph(parsedFiles) {
  if (!Array.isArray(parsedFiles) || parsedFiles.length === 0) {
    return { nodes: [], edges: [], clusters: [], stats: {} };
  }

  // Build a fast lookup set of all file paths
  const filePathSet = new Set(parsedFiles.map((f) => f.path));

  // Build nodes
  const nodes = parsedFiles.map((pf) => {
    const parsed = pf.parsed || {};
    const lines = pf.content ? pf.content.split('\n').length : 0;
    const complexity = parsed.functions
      ? parsed.functions.reduce((s, fn) => s + (fn.complexity || 1), 0)
      : 1;
    const avgComplexity =
      parsed.functions && parsed.functions.length > 0
        ? complexity / parsed.functions.length
        : 1;

    return {
      id: pf.path,
      path: pf.path,
      name: path.basename(pf.path),
      directory: path.dirname(pf.path).replace(/\\/g, '/'),
      language: pf.language,
      color: getLanguageColor(pf.language),
      size: pf.size || 0,
      lines,
      complexity,
      avgComplexity: Math.round(avgComplexity * 10) / 10,
      functions: parsed.functions || [],
      classes: parsed.classes || [],
      importCount: (parsed.imports || []).length,
      exportCount: (parsed.exports || []).length,
      type: 'file',
      // For D3 force layout initial positioning
      x: Math.random() * 800,
      y: Math.random() * 600,
    };
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build edges from import resolution
  const edges = [];
  const edgeSet = new Set(); // dedup

  for (const pf of parsedFiles) {
    const parsed = pf.parsed || {};
    const rawImports = parsed.rawImports || [];

    for (const imp of rawImports) {
      if (!imp.startsWith('.')) continue; // skip external

      const resolved = resolveImport(pf.path, imp);
      if (!resolved) continue;

      const target = findMatchingFile(resolved, filePathSet);
      if (!target || target === pf.path) continue;

      const edgeId = `${pf.path}→${target}`;
      if (edgeSet.has(edgeId)) continue;
      edgeSet.add(edgeId);

      edges.push({
        id: edgeId,
        source: pf.path,
        target,
        type: 'import',
        weight: 1,
      });
    }
  }

  // Compute in-degree / out-degree for each node
  for (const edge of edges) {
    const srcNode = nodeMap.get(edge.source);
    const tgtNode = nodeMap.get(edge.target);
    if (srcNode) srcNode.outDegree = (srcNode.outDegree || 0) + 1;
    if (tgtNode) tgtNode.inDegree = (tgtNode.inDegree || 0) + 1;
  }

  // Build clusters by top-level directory
  const clusterMap = new Map();
  for (const node of nodes) {
    const parts = node.path.split('/');
    const clusterName = parts.length > 1 ? parts[0] : 'root';
    if (!clusterMap.has(clusterName)) {
      clusterMap.set(clusterName, { id: clusterName, name: clusterName, nodeIds: [] });
    }
    clusterMap.get(clusterName).nodeIds.push(node.id);
  }
  const clusters = Array.from(clusterMap.values());

  const stats = {
    totalFiles: nodes.length,
    totalEdges: edges.length,
    totalClusters: clusters.length,
    languages: [...new Set(nodes.map((n) => n.language))],
    avgComplexity:
      nodes.length > 0
        ? Math.round((nodes.reduce((s, n) => s + n.avgComplexity, 0) / nodes.length) * 10) / 10
        : 0,
    mostConnected: nodes
      .sort((a, b) => ((b.inDegree || 0) + (b.outDegree || 0)) - ((a.inDegree || 0) + (a.outDegree || 0)))
      .slice(0, 5)
      .map((n) => ({ path: n.path, connections: (n.inDegree || 0) + (n.outDegree || 0) })),
  };

  return { nodes, edges, clusters, stats };
}

module.exports = { buildGraph, resolveImport, findMatchingFile };
