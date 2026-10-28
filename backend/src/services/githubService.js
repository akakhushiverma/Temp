'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cacheManager = require('../utils/cacheManager');

const GITHUB_API_BASE = 'https://api.github.com';

// Languages we will fetch and parse content for
const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.java', '.rb', '.go', '.rs',
  '.json', '.md', '.yml', '.yaml',
  '.html', '.css', '.scss', '.less',
  '.vue', '.svelte',
]);

// Map extension → language label
const EXT_TO_LANG = {
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python', '.java': 'java', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.json': 'json', '.md': 'markdown',
  '.yml': 'yaml', '.yaml': 'yaml',
  '.html': 'html', '.css': 'css', '.scss': 'scss', '.less': 'less',
  '.vue': 'vue', '.svelte': 'svelte',
};

/**
 * Build Axios headers with optional GitHub token.
 */
function buildHeaders() {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'RepoSketch-Astral-Cartographer/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * Parse a GitHub URL into { owner, repo }.
 * Handles:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch
 */
function parseGitHubUrl(url) {
  const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    const err = new Error(`Invalid GitHub URL: ${url}`);
    err.status = 400;
    throw err;
  }
  return { owner: match[1], repo: match[2] };
}

/**
 * Get extension from path.
 */
function getExtension(filePath) {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.slice(lastDot).toLowerCase();
}

/**
 * Fetch the default branch for a repo.
 */
async function fetchDefaultBranch(owner, repo, headers) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  const { data } = await axios.get(url, { headers });
  return data.default_branch || 'main';
}

/**
 * Fetch the SHA of the HEAD commit for a branch.
 */
async function fetchBranchSha(owner, repo, branch, headers) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  const { data } = await axios.get(url, { headers });
  return data.object.sha;
}

/**
 * Fetch the full recursive file tree.
 * Returns array of tree items: { path, type, sha, size, url }
 */
async function fetchFileTree(owner, repo, treeSha, headers) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
  const { data } = await axios.get(url, { headers });
  if (data.truncated) {
    console.warn(`[GithubService] Tree for ${owner}/${repo} is truncated (>100k files).`);
  }
  return data.tree || [];
}

/**
 * Fetch the content of a single file (base64-encoded from GitHub).
 * Returns decoded string or null on failure.
 */
async function fetchFileContent(owner, repo, filePath, headers) {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;
    const { data } = await axios.get(url, { headers });
    if (data.encoding === 'base64') {
      return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    }
    return null;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

/**
 * Main entry point: ingest a GitHub repository by URL.
 *
 * @param {string} githubUrl - e.g. https://github.com/facebook/react
 * @returns {Promise<RepoData>}
 */
async function ingestRepo(githubUrl) {
  const { owner, repo } = parseGitHubUrl(githubUrl);
  const cacheKey = `repo:${owner}/${repo}`;

  const cached = cacheManager.get(cacheKey);
  if (cached) {
    console.log(`[GithubService] Cache hit for ${owner}/${repo}`);
    return cached;
  }

  const headers = buildHeaders();

  // 1. Fetch repo metadata and default branch
  let repoMeta;
  try {
    const { data } = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });
    repoMeta = data;
  } catch (err) {
    if (err.response) {
      const apiErr = new Error(`GitHub API error: ${err.response.data.message || err.response.statusText}`);
      apiErr.status = err.response.status;
      apiErr.response = err.response;
      throw apiErr;
    }
    throw err;
  }

  const defaultBranch = repoMeta.default_branch || 'main';

  // 2. Fetch HEAD SHA
  const branchSha = await fetchBranchSha(owner, repo, defaultBranch, headers);

  // 3. Fetch full recursive tree
  const treeItems = await fetchFileTree(owner, repo, branchSha, headers);

  // 4. Filter to supported files only (blobs, not trees)
  const fileItems = treeItems.filter((item) => {
    if (item.type !== 'blob') return false;
    const ext = getExtension(item.path);
    return SUPPORTED_EXTENSIONS.has(ext);
  });

  console.log(`[GithubService] Found ${fileItems.length} supported files in ${owner}/${repo}`);

  // 5. Fetch file contents with concurrency limit
  const CONCURRENCY = 5;
  const files = [];
  for (let i = 0; i < fileItems.length; i += CONCURRENCY) {
    const batch = fileItems.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const ext = getExtension(item.path);
        const language = EXT_TO_LANG[ext] || 'unknown';
        const content = await fetchFileContent(owner, repo, item.path, headers);
        return {
          path: item.path,
          content: content || '',
          size: item.size || 0,
          language,
          sha: item.sha,
        };
      })
    );
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        files.push(result.value);
      } else if (result.status === 'rejected') {
        console.warn(`[GithubService] Failed to fetch file: ${result.reason.message}`);
      }
    }
    // Small delay to be polite to the API
    if (i + CONCURRENCY < fileItems.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const repoId = uuidv4();

  const repoData = {
    repoId,
    owner,
    repo,
    url: githubUrl,
    defaultBranch,
    files,
    metadata: {
      fullName: repoMeta.full_name,
      description: repoMeta.description,
      stars: repoMeta.stargazers_count,
      forks: repoMeta.forks_count,
      language: repoMeta.language,
      size: repoMeta.size,
      topics: repoMeta.topics || [],
      createdAt: repoMeta.created_at,
      updatedAt: repoMeta.updated_at,
      defaultBranch,
      totalFiles: files.length,
      ingestedAt: new Date().toISOString(),
    },
  };

  // Cache under both the generated repoId and the owner/repo key
  cacheManager.set(cacheKey, repoData);
  cacheManager.set(`repoId:${repoId}`, repoData);

  // Also maintain a registry of all repos
  const registry = cacheManager.get('repo:registry') || {};
  registry[repoId] = {
    repoId,
    owner,
    repo,
    url: githubUrl,
    fullName: repoMeta.full_name,
    ingestedAt: repoData.metadata.ingestedAt,
  };
  cacheManager.set('repo:registry', registry);

  console.log(`[GithubService] Ingested ${owner}/${repo} as repoId=${repoId} (${files.length} files)`);
  return repoData;
}

/**
 * Retrieve previously ingested repo data by repoId.
 */
function getRepoById(repoId) {
  const data = cacheManager.get(`repoId:${repoId}`);
  if (!data) {
    const err = new Error(`Repository ${repoId} not found in cache. Please re-ingest.`);
    err.status = 404;
    throw err;
  }
  return data;
}

/**
 * List all ingested repos.
 */
function listRepos() {
  return Object.values(cacheManager.get('repo:registry') || {});
}

/**
 * Get the raw file tree for a repo (paths + metadata, no content).
 */
function getFileTree(repoId) {
  const repo = getRepoById(repoId);
  return repo.files.map(({ path, size, language, sha }) => ({ path, size, language, sha }));
}

/**
 * Get the content of a specific file within a repo.
 */
function getFileContent(repoId, filePath) {
  const repo = getRepoById(repoId);
  const file = repo.files.find((f) => f.path === filePath);
  if (!file) {
    const err = new Error(`File "${filePath}" not found in repo ${repoId}`);
    err.status = 404;
    throw err;
  }
  return file;
}

module.exports = {
  ingestRepo,
  getRepoById,
  listRepos,
  getFileTree,
  getFileContent,
  parseGitHubUrl,
};
