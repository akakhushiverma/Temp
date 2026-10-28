'use strict';

/**
 * Cyclomatic complexity analysis.
 *
 * Complexity = 1 + number of decision points in the code.
 * Decision points: if, else if, for, while, do, switch case, catch, &&, ||, ?:
 *
 * Risk levels:
 *  1-10  → Low (simple, easy to test)
 *  11-20 → Moderate (more complex, needs attention)
 *  21-50 → High (difficult to test, refactor recommended)
 *  50+   → Very High (untestable, serious technical debt)
 */

const RISK_LEVELS = [
  { max: 10, label: 'low', color: '#4ade80' },
  { max: 20, label: 'moderate', color: '#facc15' },
  { max: 50, label: 'high', color: '#f97316' },
  { max: Infinity, label: 'critical', color: '#ef4444' },
];

function getRiskLevel(complexity) {
  for (const level of RISK_LEVELS) {
    if (complexity <= level.max) return { label: level.label, color: level.color };
  }
  return { label: 'critical', color: '#ef4444' };
}

/**
 * Analyze complexity from pre-parsed AST data (output of astParser.parseFile).
 * If raw AST is not available we rely on function-level complexity already
 * computed by the parser.
 *
 * @param {object} parsedFile - output from astParser.parseFile()
 * @returns {{ functions: [], fileComplexity: number, averageComplexity: number, riskLevel: object }}
 */
function analyzeComplexity(parsedFile) {
  if (!parsedFile || !Array.isArray(parsedFile.functions)) {
    return {
      functions: [],
      fileComplexity: 1,
      averageComplexity: 1,
      riskLevel: getRiskLevel(1),
    };
  }

  const functionDetails = parsedFile.functions.map((fn) => {
    const complexity = fn.complexity || 1;
    return {
      name: fn.name,
      complexity,
      riskLevel: getRiskLevel(complexity),
      startLine: fn.startLine || 0,
      endLine: fn.endLine || 0,
      lines: fn.lines || 0,
      params: fn.params || 0,
    };
  });

  // Sum all function complexities as proxy for file complexity
  const totalComplexity = functionDetails.reduce((sum, fn) => sum + fn.complexity, 0);
  const fileComplexity = functionDetails.length > 0 ? totalComplexity : 1;
  const averageComplexity =
    functionDetails.length > 0
      ? Math.round((totalComplexity / functionDetails.length) * 10) / 10
      : 1;

  // Sort descending by complexity for easy identification of hotspots
  const sorted = [...functionDetails].sort((a, b) => b.complexity - a.complexity);

  return {
    functions: sorted,
    fileComplexity,
    averageComplexity,
    riskLevel: getRiskLevel(averageComplexity),
    hotspots: sorted.slice(0, 5), // top 5 most complex functions
  };
}

/**
 * Analyze complexity across all files in a repository.
 *
 * @param {Array<{path: string, language: string, parsed: object}>} parsedFiles
 * @returns {{ files: [], summary: object }}
 */
function analyzeAllFiles(parsedFiles) {
  if (!Array.isArray(parsedFiles) || parsedFiles.length === 0) {
    return { files: [], summary: { totalFiles: 0, averageComplexity: 0, highRiskFiles: 0 } };
  }

  const files = parsedFiles.map((pf) => {
    const analysis = analyzeComplexity(pf.parsed);
    return {
      path: pf.path,
      language: pf.language,
      ...analysis,
    };
  });

  const totalAvg = files.reduce((sum, f) => sum + f.averageComplexity, 0);
  const overallAverage = Math.round((totalAvg / files.length) * 10) / 10;
  const highRiskFiles = files.filter(
    (f) => f.riskLevel.label === 'high' || f.riskLevel.label === 'critical'
  ).length;

  const mostComplex = [...files]
    .sort((a, b) => b.fileComplexity - a.fileComplexity)
    .slice(0, 10);

  return {
    files,
    summary: {
      totalFiles: files.length,
      overallAverageComplexity: overallAverage,
      overallRiskLevel: getRiskLevel(overallAverage),
      highRiskFiles,
      mostComplexFiles: mostComplex.map((f) => ({
        path: f.path,
        fileComplexity: f.fileComplexity,
        averageComplexity: f.averageComplexity,
        riskLevel: f.riskLevel,
      })),
    },
  };
}

module.exports = { analyzeComplexity, analyzeAllFiles, getRiskLevel };
