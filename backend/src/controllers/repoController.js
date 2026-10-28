'use strict';

const githubService = require('../services/githubService');
const { countTokens } = require('../utils/tokenCounter');

/**
 * POST /api/repo/ingest
 * Body: { url: "https://github.com/owner/repo" }
 */
async function ingestRepo(req, res, next) {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "url" in request body.' });
    }
    const trimmed = url.trim();
    if (!trimmed.includes('github.com')) {
      return res.status(400).json({ error: 'Only GitHub repositories are supported at this time.' });
    }

    console.log(`[RepoController] Ingesting: ${trimmed}`);
    const repoData = await githubService.ingestRepo(trimmed);

    return res.status(200).json({
      success: true,
      repoId: repoData.repoId,
      owner: repoData.owner,
      repo: repoData.repo,
      metadata: repoData.metadata,
      totalFiles: repoData.files.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/repo/list
 */
function listRepos(req, res, next) {
  try {
    const repos = githubService.listRepos();
    return res.json({ repos });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/repo/:repoId/tree
 */
function getFileTree(req, res, next) {
  try {
    const { repoId } = req.params;
    const tree = githubService.getFileTree(repoId);
    return res.json({ repoId, tree });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/repo/:repoId/file?path=src/index.js
 */
function getFileContent(req, res, next) {
  try {
    const { repoId } = req.params;
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'Query param "path" is required.' });
    }
    const file = githubService.getFileContent(repoId, filePath);
    const tokens = countTokens(file.content);
    const lines = file.content.split('\n').length;

    return res.json({
      repoId,
      path: file.path,
      content: file.content,
      language: file.language,
      size: file.size,
      tokens,
      lines,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { ingestRepo, listRepos, getFileTree, getFileContent };
