'use strict';

const express = require('express');
const router = express.Router();
const repoController = require('../controllers/repoController');

// POST /api/repo/ingest  — ingest a GitHub repository by URL
router.post('/ingest', repoController.ingestRepo);

// GET /api/repo/list  — list all ingested repositories
router.get('/list', repoController.listRepos);

// GET /api/repo/:repoId/tree  — get the file tree for a repo
router.get('/:repoId/tree', repoController.getFileTree);

// GET /api/repo/:repoId/file?path=src/index.js  — get a single file's content
router.get('/:repoId/file', repoController.getFileContent);

module.exports = router;
