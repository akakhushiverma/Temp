'use strict';

const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

// GET /api/analysis/:repoId/graph        — full dependency graph (nodes + edges)
router.get('/:repoId/graph', analysisController.getDependencyGraph);

// GET /api/analysis/:repoId/health       — architectural health scores
router.get('/:repoId/health', analysisController.getHealthScores);

// GET /api/analysis/:repoId/complexity   — per-file cyclomatic complexity
router.get('/:repoId/complexity', analysisController.getComplexity);

// GET /api/analysis/:repoId/circular     — circular dependency cycles
router.get('/:repoId/circular', analysisController.getCircularDeps);

// GET /api/analysis/:repoId/onboarding   — smart onboarding pathfinder data
router.get('/:repoId/onboarding', analysisController.getOnboarding);

// GET /api/analysis/:repoId/search?q=term — search symbols / files / functions
router.get('/:repoId/search', analysisController.searchRepo);

// GET /api/analysis/:repoId/heatmap      — heatmap heat scores per file
router.get('/:repoId/heatmap', analysisController.getHeatmap);

module.exports = router;
