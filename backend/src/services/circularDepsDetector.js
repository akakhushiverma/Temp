'use strict';

/**
 * Circular Dependency Detection using Tarjan's Strongly Connected Components (SCC) algorithm.
 *
 * A circular dependency exists when a set of files forms a cycle:
 *   A imports B, B imports C, C imports A  →  circular!
 *
 * Tarjan's algorithm finds all SCCs in O(V + E) time.
 * An SCC with more than 1 node indicates a circular dependency.
 */

/**
 * Tarjan's SCC algorithm.
 *
 * @param {Map<string, string[]>} graph - adjacency list: nodeId → [targetIds]
 * @returns {string[][]} - array of SCCs (each SCC is an array of node IDs)
 */
function tarjanSCC(graph) {
  const index = new Map();
  const lowLink = new Map();
  const onStack = new Map();
  const stack = [];
  const sccs = [];
  let counter = 0;

  function strongConnect(v) {
    index.set(v, counter);
    lowLink.set(v, counter);
    counter++;
    stack.push(v);
    onStack.set(v, true);

    const neighbours = graph.get(v) || [];
    for (const w of neighbours) {
      if (!index.has(w)) {
        strongConnect(w);
        lowLink.set(v, Math.min(lowLink.get(v), lowLink.get(w)));
      } else if (onStack.get(w)) {
        lowLink.set(v, Math.min(lowLink.get(v), index.get(w)));
      }
    }

    // If v is a root node, pop the stack and generate an SCC
    if (lowLink.get(v) === index.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.set(w, false);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const v of graph.keys()) {
    if (!index.has(v)) {
      strongConnect(v);
    }
  }

  return sccs;
}

/**
 * Detect circular dependencies in a dependency graph.
 *
 * @param {{ nodes: [], edges: [] }} graphData - output of dependencyGraph.buildGraph()
 * @returns {{ cycles: [], totalCycles: number, affectedFiles: string[], severity: string }}
 */
function detectCircular(graphData) {
  const { nodes = [], edges = [] } = graphData;

  if (!nodes.length || !edges.length) {
    return { cycles: [], totalCycles: 0, affectedFiles: [], severity: 'none' };
  }

  // Build adjacency list from edges
  const adjacency = new Map();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source).push(edge.target);
    }
  }

  // Run Tarjan's SCC
  const sccs = tarjanSCC(adjacency);

  // Filter SCCs with more than 1 node (those are the cycles)
  const cycles = sccs
    .filter((scc) => scc.length > 1)
    .map((scc) => ({
      files: scc,
      length: scc.length,
      // Create a readable cycle representation
      description: scc.join(' → ') + ' → ' + scc[0],
    }));

  // Mark edges that are part of cycles
  const cycleFileSet = new Set(cycles.flatMap((c) => c.files));

  // Severity assessment
  let severity;
  if (cycles.length === 0) severity = 'none';
  else if (cycles.length <= 2) severity = 'low';
  else if (cycles.length <= 5) severity = 'moderate';
  else if (cycles.length <= 10) severity = 'high';
  else severity = 'critical';

  return {
    cycles,
    totalCycles: cycles.length,
    affectedFiles: Array.from(cycleFileSet),
    severity,
    recommendation:
      cycles.length > 0
        ? 'Refactor circular dependencies by introducing abstraction layers or reversing dependency directions.'
        : 'No circular dependencies detected. Excellent architecture!',
  };
}

module.exports = { detectCircular, tarjanSCC };
