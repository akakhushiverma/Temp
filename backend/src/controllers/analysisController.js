'use strict';

const githubService = require('../services/githubService');
const astParser = require('../services/astParser');
const dependencyGraph = require('../services/dependencyGraph');
const healthScorer = require('../services/healthScorer');
const complexityAnalyzer = require('../services/complexityAnalyzer');
const circularDepsDetector = require('../services/circularDepsDetector');
const onboardingPathfinder = require('../services/onboardingPathfinder');
const cacheManager = require('../utils/cacheManager');

/**
 * Helper: parse all files in a repo and cache results.
 */
async function getParsedFiles(repoId) {
  const cacheKey = `parsed:${repoId}`;
  return cacheManager.getOrSet(cacheKey, async () => {
    const repoData = githubService.getRepoById(repoId);
    return repoData.files.map((file) => {
      const parsed = astParser.parseFile(file.path, file.content, file.language);
      return { path: file.path, language: file.language, content: file.content, size: file.size, parsed };
    });
  });
}

/**
 * Helper: build graph and cache.
 */
async function getGraph(repoId) {
  const cacheKey = `graph:${repoId}`;
  return cacheManager.getOrSet(cacheKey, async () => {
    const parsedFiles = await getParsedFiles(repoId);
    return dependencyGraph.buildGraph(parsedFiles);
  });
}

/**
 * Helper: compute health and cache.
 */
async function getHealth(repoId) {
  const cacheKey = `health:${repoId}`;
  return cacheManager.getOrSet(cacheKey, async () => {
    const [parsedFiles, graph] = await Promise.all([getParsedFiles(repoId), getGraph(repoId)]);
    return healthScorer.scoreRepo(repoId, graph, parsedFiles);
  });
}

// ── Controllers ───────────────────────────────────────────────────────────────

async function getDependencyGraph(req, res, next) {
  try {
    const { repoId } = req.params;
    const graph = await getGraph(repoId);
    return res.json({ repoId, ...graph });
  } catch (err) {
    next(err);
  }
}

async function getHealthScores(req, res, next) {
  try {
    const { repoId } = req.params;
    const health = await getHealth(repoId);
    return res.json({ repoId, ...health });
  } catch (err) {
    next(err);
  }
}

async function getComplexity(req, res, next) {
  try {
    const { repoId } = req.params;
    const cacheKey = `complexity:${repoId}`;
    const result = await cacheManager.getOrSet(cacheKey, async () => {
      const parsedFiles = await getParsedFiles(repoId);
      return complexityAnalyzer.analyzeAllFiles(parsedFiles);
    });
    return res.json({ repoId, ...result });
  } catch (err) {
    next(err);
  }
}

async function getCircularDeps(req, res, next) {
  try {
    const { repoId } = req.params;
    const cacheKey = `circular:${repoId}`;
    const result = await cacheManager.getOrSet(cacheKey, async () => {
      const graph = await getGraph(repoId);
      return circularDepsDetector.detectCircular(graph);
    });
    return res.json({ repoId, ...result });
  } catch (err) {
    next(err);
  }
}

async function getOnboarding(req, res, next) {
  try {
    const { repoId } = req.params;
    const cacheKey = `onboarding:${repoId}`;
    const result = await cacheManager.getOrSet(cacheKey, async () => {
      const [graph, health] = await Promise.all([getGraph(repoId), getHealth(repoId)]);
      return onboardingPathfinder.generatePathways(repoId, graph, health);
    });
    return res.json({ repoId, ...result });
  } catch (err) {
    next(err);
  }
}

async function searchRepo(req, res, next) {
  try {
    const { repoId } = req.params;
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ error: 'Query param "q" is required.' });
    }
    const parsedFiles = await getParsedFiles(repoId);
    const query = q.trim().toLowerCase();

    const results = [];

    for (const pf of parsedFiles) {
      // File match
      if (pf.path.toLowerCase().includes(query)) {
        results.push({ type: 'file', path: pf.path, language: pf.language, match: pf.path });
      }
      // Function match
      for (const fn of (pf.parsed.functions || [])) {
        if (fn.name.toLowerCase().includes(query)) {
          results.push({
            type: 'function',
            path: pf.path,
            language: pf.language,
            name: fn.name,
            line: fn.startLine,
            complexity: fn.complexity,
            match: fn.name,
          });
        }
      }
      // Class match
      for (const cls of (pf.parsed.classes || [])) {
        if (cls.name.toLowerCase().includes(query)) {
          results.push({
            type: 'class',
            path: pf.path,
            language: pf.language,
            name: cls.name,
            line: cls.startLine,
            match: cls.name,
          });
        }
      }
    }

    return res.json({ repoId, query: q, total: results.length, results: results.slice(0, 100) });
  } catch (err) {
    next(err);
  }
}

async function getHeatmap(req, res, next) {
  try {
    const { repoId } = req.params;
    const health = await getHealth(repoId);
    const heatmap = health.heatmap || [];
    return res.json({ repoId, heatmap });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDependencyGraph,
  getHealthScores,
  getComplexity,
  getCircularDeps,
  getOnboarding,
  searchRepo,
  getHeatmap,
};
