'use strict';

const path = require('path');

/**
 * Smart Onboarding Pathfinder
 *
 * Analyses the dependency graph and health data to generate:
 * 1. Good-first-issue files (low complexity, low coupling)
 * 2. Blast radius map (how many files break if a file changes)
 * 3. Ordered learning path (beginner → advanced)
 * 4. Entry points (most imported files = architectural anchors)
 */

/**
 * Compute blast radius: for each file, how many files directly or
 * transitively depend on it? (reverse-BFS)
 *
 * @param {{ nodes, edges }} graphData
 * @returns {Map<string, string[]>}  fileId → array of dependents
 */
function computeBlastRadius(graphData) {
  const { nodes, edges } = graphData;

  // Build reverse adjacency (who imports me?)
  const reverseAdj = new Map();
  for (const node of nodes) reverseAdj.set(node.id, []);
  for (const edge of edges) {
    if (reverseAdj.has(edge.target)) {
      reverseAdj.get(edge.target).push(edge.source);
    }
  }

  // BFS from each node to find all transitive dependents
  const blastRadius = new Map();

  for (const node of nodes) {
    const visited = new Set();
    const queue = [node.id];
    while (queue.length) {
      const curr = queue.shift();
      const deps = reverseAdj.get(curr) || [];
      for (const dep of deps) {
        if (!visited.has(dep) && dep !== node.id) {
          visited.add(dep);
          queue.push(dep);
        }
      }
    }
    blastRadius.set(node.id, Array.from(visited));
  }

  return blastRadius;
}

/**
 * Score a file for "newcomer friendliness".
 * Lower score = better first file to explore.
 *
 * Factors:
 *  - Low cyclomatic complexity
 *  - Low number of imports
 *  - Small file size
 *  - Not in a deep nested directory
 */
function newcomerScore(node) {
  const complexityPenalty = (node.avgComplexity || 1) * 3;
  const importPenalty = (node.importCount || 0) * 2;
  const sizePenalty = Math.min((node.lines || 0) / 50, 10);
  const depthPenalty = (node.path.split('/').length - 1) * 1;
  return complexityPenalty + importPenalty + sizePenalty + depthPenalty;
}

/**
 * Classify a file difficulty.
 */
function getDifficulty(score) {
  if (score < 10) return 'beginner';
  if (score < 25) return 'intermediate';
  return 'advanced';
}

/**
 * Main pathfinder function.
 *
 * @param {string} repoId
 * @param {{ nodes, edges, clusters }} graphData
 * @param {{ overall, metrics, godFiles, heatmap }} healthData
 * @returns {{ goodFirstIssues, entryPoints, blastRadiusMap, learningPath, summary }}
 */
function generatePathways(repoId, graphData, healthData) {
  const { nodes = [], edges = [] } = graphData;

  if (!nodes.length) {
    return {
      goodFirstIssues: [],
      entryPoints: [],
      blastRadiusMap: {},
      learningPath: [],
      summary: { totalFiles: 0 },
    };
  }

  const blastRadiusMap = computeBlastRadius(graphData);

  // ── Good First Issues ──────────────────────────────────────────────────────
  const scoredNodes = nodes.map((n) => ({
    ...n,
    newcomerScore: newcomerScore(n),
    blastRadius: (blastRadiusMap.get(n.id) || []).length,
  }));

  const goodFirstIssues = scoredNodes
    .filter((n) => {
      // Exclude god files, markdown, JSON, and test files
      const isGodFile = (healthData.godFiles || []).some((g) => g.path === n.path);
      const isTestFile = /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(n.path) || n.path.includes('__test__');
      const isConfig = ['.json', '.yml', '.yaml', '.md'].some((e) => n.path.endsWith(e));
      return !isGodFile && !isConfig && (n.avgComplexity || 1) < 10;
    })
    .sort((a, b) => a.newcomerScore - b.newcomerScore)
    .slice(0, 15)
    .map((n) => ({
      path: n.path,
      language: n.language,
      lines: n.lines,
      complexity: n.avgComplexity,
      imports: n.importCount,
      blastRadius: n.blastRadius,
      difficulty: getDifficulty(n.newcomerScore),
      score: Math.round(n.newcomerScore),
      reason: `Low complexity (${n.avgComplexity || 1}), ${n.importCount || 0} imports — great place to start`,
    }));

  // ── Entry Points (high in-degree) ────────────────────────────────────────
  const entryPoints = nodes
    .filter((n) => (n.inDegree || 0) > 2)
    .sort((a, b) => (b.inDegree || 0) - (a.inDegree || 0))
    .slice(0, 10)
    .map((n) => ({
      path: n.path,
      language: n.language,
      inDegree: n.inDegree || 0,
      outDegree: n.outDegree || 0,
      blastRadius: (blastRadiusMap.get(n.id) || []).length,
      description: `Imported by ${n.inDegree || 0} files — architectural anchor`,
    }));

  // ── Ordered Learning Path ─────────────────────────────────────────────────
  // Start with low-complexity utilities, then work up to complex modules
  const learningPath = scoredNodes
    .filter((n) => !['json', 'markdown', 'yaml'].includes(n.language))
    .sort((a, b) => a.newcomerScore - b.newcomerScore)
    .slice(0, 20)
    .map((n, idx) => ({
      order: idx + 1,
      path: n.path,
      language: n.language,
      difficulty: getDifficulty(n.newcomerScore),
      complexity: n.avgComplexity,
      lines: n.lines,
      reason: getDifficultyReason(n),
    }));

  // ── Blast Radius Map (serialisable) ──────────────────────────────────────
  const blastRadiusObj = {};
  for (const [fileId, dependents] of blastRadiusMap) {
    const severity =
      dependents.length === 0 ? 'none' :
      dependents.length < 3 ? 'low' :
      dependents.length < 8 ? 'medium' : 'high';
    blastRadiusObj[fileId] = { dependents, count: dependents.length, severity };
  }

  return {
    goodFirstIssues,
    entryPoints,
    blastRadiusMap: blastRadiusObj,
    learningPath,
    summary: {
      totalFiles: nodes.length,
      goodFirstCount: goodFirstIssues.length,
      entryPointCount: entryPoints.length,
      avgBlastRadius: nodes.length
        ? Math.round(scoredNodes.reduce((s, n) => s + n.blastRadius, 0) / nodes.length * 10) / 10
        : 0,
    },
  };
}

function getDifficultyReason(node) {
  if ((node.avgComplexity || 1) <= 3 && (node.importCount || 0) <= 2) {
    return 'Isolated utility — minimal dependencies';
  }
  if ((node.importCount || 0) <= 5 && (node.avgComplexity || 1) <= 8) {
    return 'Self-contained module — manageable scope';
  }
  if ((node.inDegree || 0) > 5) {
    return 'Core module — understanding this unlocks many files';
  }
  return 'Complex module — best tackled after the basics';
}

module.exports = { generatePathways, computeBlastRadius };
