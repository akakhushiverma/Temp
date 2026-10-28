'use strict';

/**
 * Architectural Health Scoring for RepoSketch.
 *
 * Scores are normalised 0–100 (higher = healthier).
 * Weights:
 *   coupling      25%  – how tightly files are coupled
 *   complexity    30%  – average cyclomatic complexity
 *   cohesion      20%  – files grouped logically in directories
 *   maintainability 25% – inverse of god-file ratio
 */

const GOD_FILE_IMPORT_THRESHOLD = 10;
const GOD_FILE_LINE_THRESHOLD = 500;
const GOD_FILE_FUNCTION_THRESHOLD = 20;
const HIGH_COMPLEXITY_THRESHOLD = 15;

/**
 * Clamp a value between min and max.
 */
function clamp(val, min = 0, max = 100) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Score coupling (0-100). Lower avg out-degree is better.
 * Formula: score = 100 - (avgOutDegree / maxExpected) * 100
 */
function scoreCoupling(nodes) {
  if (!nodes.length) return 100;
  const avgOut = nodes.reduce((s, n) => s + (n.outDegree || 0), 0) / nodes.length;
  // Anything with avg out-degree >= 20 gets 0
  const raw = 100 - (avgOut / 20) * 100;
  return clamp(Math.round(raw));
}

/**
 * Score complexity (0-100). Lower avg complexity is better.
 * Formula: score = 100 - ((avgComplexity - 1) / 19) * 100  (1=best, 20+=worst)
 */
function scoreComplexity(nodes) {
  if (!nodes.length) return 100;
  const avg = nodes.reduce((s, n) => s + (n.avgComplexity || 1), 0) / nodes.length;
  const raw = 100 - ((avg - 1) / 19) * 100;
  return clamp(Math.round(raw));
}

/**
 * Score cohesion (0-100). Files spread across many shallow directories = bad.
 * Heuristic: if each cluster has >= 3 files, cohesion is good.
 */
function scoreCohesion(clusters, nodes) {
  if (!clusters.length || !nodes.length) return 100;
  const avgClusterSize = nodes.length / clusters.length;
  // Ideal: 5–15 files per cluster
  let raw;
  if (avgClusterSize >= 5 && avgClusterSize <= 15) raw = 100;
  else if (avgClusterSize < 5) raw = (avgClusterSize / 5) * 100;
  else raw = Math.max(0, 100 - ((avgClusterSize - 15) / 15) * 50);
  return clamp(Math.round(raw));
}

/**
 * Score maintainability (0-100). Based on god-file ratio.
 */
function scoreMaintainability(nodes, godFiles) {
  if (!nodes.length) return 100;
  const ratio = godFiles.length / nodes.length;
  const raw = 100 - ratio * 100;
  return clamp(Math.round(raw));
}

/**
 * Identify "god files" — overly large / complex / highly-coupled files.
 */
function identifyGodFiles(nodes) {
  return nodes.filter(
    (n) =>
      (n.importCount || 0) >= GOD_FILE_IMPORT_THRESHOLD ||
      (n.lines || 0) >= GOD_FILE_LINE_THRESHOLD ||
      (n.functions || []).length >= GOD_FILE_FUNCTION_THRESHOLD
  ).map((n) => ({
    path: n.path,
    language: n.language,
    lines: n.lines,
    importCount: n.importCount,
    functionCount: (n.functions || []).length,
    complexity: n.avgComplexity,
    reasons: [
      n.importCount >= GOD_FILE_IMPORT_THRESHOLD && `High imports (${n.importCount})`,
      n.lines >= GOD_FILE_LINE_THRESHOLD && `Large file (${n.lines} lines)`,
      (n.functions || []).length >= GOD_FILE_FUNCTION_THRESHOLD && `Many functions (${(n.functions || []).length})`,
    ].filter(Boolean),
  }));
}

/**
 * Identify technical debt hotspots.
 */
function identifyTechnicalDebt(nodes) {
  return nodes
    .filter((n) => n.avgComplexity >= HIGH_COMPLEXITY_THRESHOLD && (n.importCount || 0) >= 5)
    .map((n) => ({
      path: n.path,
      language: n.language,
      complexity: n.avgComplexity,
      importCount: n.importCount,
      debtScore: Math.round(n.avgComplexity * (n.importCount || 1)),
      recommendation: 'Consider splitting into smaller modules with single responsibility.',
    }))
    .sort((a, b) => b.debtScore - a.debtScore)
    .slice(0, 20);
}

/**
 * Build heatmap data: each file gets a heat score 0–1.
 * Heat = weighted average of: normalised complexity, normalised size, normalised coupling.
 */
function buildHeatmap(nodes) {
  if (!nodes.length) return [];

  const maxComplexity = Math.max(...nodes.map((n) => n.avgComplexity || 1), 1);
  const maxLines = Math.max(...nodes.map((n) => n.lines || 1), 1);
  const maxDegree = Math.max(...nodes.map((n) => (n.inDegree || 0) + (n.outDegree || 0)), 1);

  return nodes.map((n) => {
    const normComplexity = (n.avgComplexity || 1) / maxComplexity;
    const normSize = (n.lines || 0) / maxLines;
    const normCoupling = ((n.inDegree || 0) + (n.outDegree || 0)) / maxDegree;
    const heat = normComplexity * 0.4 + normSize * 0.3 + normCoupling * 0.3;
    return {
      path: n.path,
      heat: Math.round(heat * 100) / 100,
      complexity: n.avgComplexity,
      lines: n.lines,
      coupling: (n.inDegree || 0) + (n.outDegree || 0),
    };
  }).sort((a, b) => b.heat - a.heat);
}

/**
 * Main scoring function.
 *
 * @param {string} repoId
 * @param {{ nodes, edges, clusters }} graphData
 * @param {Array} parsedFiles
 * @returns {{ overall, metrics, godFiles, technicalDebt, heatmap }}
 */
function scoreRepo(repoId, graphData, parsedFiles) {
  const { nodes = [], edges = [], clusters = [] } = graphData;

  const godFiles = identifyGodFiles(nodes);
  const technicalDebt = identifyTechnicalDebt(nodes);
  const heatmap = buildHeatmap(nodes);

  const couplingScore = scoreCoupling(nodes);
  const complexityScore = scoreComplexity(nodes);
  const cohesionScore = scoreCohesion(clusters, nodes);
  const maintainabilityScore = scoreMaintainability(nodes, godFiles);

  const overall = Math.round(
    couplingScore * 0.25 +
    complexityScore * 0.30 +
    cohesionScore * 0.20 +
    maintainabilityScore * 0.25
  );

  const grade =
    overall >= 80 ? 'A' :
    overall >= 65 ? 'B' :
    overall >= 50 ? 'C' :
    overall >= 35 ? 'D' : 'F';

  return {
    overall,
    grade,
    metrics: {
      coupling: couplingScore,
      complexity: complexityScore,
      cohesion: cohesionScore,
      maintainability: maintainabilityScore,
    },
    summary: {
      totalFiles: nodes.length,
      totalEdges: edges.length,
      godFileCount: godFiles.length,
      technicalDebtCount: technicalDebt.length,
      highRiskFiles: heatmap.filter((h) => h.heat > 0.7).length,
    },
    godFiles,
    technicalDebt,
    heatmap,
  };
}

module.exports = { scoreRepo, identifyGodFiles, identifyTechnicalDebt, buildHeatmap };
