'use strict';

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// ── Babel parse options ───────────────────────────────────────────────────────
const BABEL_PLUGINS = [
  'jsx',
  'typescript',
  'decorators-legacy',
  'classProperties',
  'classPrivateMethods',
  'classPrivateProperties',
  'asyncGenerators',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'nullishCoalescingOperator',
  'optionalChaining',
  'optionalCatchBinding',
  'logicalAssignment',
  'numericSeparator',
  'objectRestSpread',
  'throwExpressions',
  'topLevelAwait',
];

// ── Complexity node types that add a branch ───────────────────────────────────
const COMPLEXITY_INCREMENT_TYPES = new Set([
  'IfStatement',
  'ElseStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'SwitchCase',
  'CatchClause',
  'ConditionalExpression', // ternary
  'LogicalExpression',     // && ||
]);

/**
 * Estimate cyclomatic complexity by traversing an AST node.
 */
function estimateComplexity(node, ast) {
  let complexity = 1; // base complexity

  // We do a simple walk within the function body
  function walk(n) {
    if (!n || typeof n !== 'object') return;

    if (COMPLEXITY_INCREMENT_TYPES.has(n.type)) {
      // LogicalExpression with && or || only
      if (n.type === 'LogicalExpression') {
        if (n.operator === '&&' || n.operator === '||' || n.operator === '??') {
          complexity += 1;
        }
      } else {
        complexity += 1;
      }
    }

    for (const key of Object.keys(n)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
      const child = n[key];
      if (Array.isArray(child)) {
        child.forEach(walk);
      } else if (child && typeof child === 'object' && child.type) {
        walk(child);
      }
    }
  }

  if (node.body) walk(node.body);
  return complexity;
}

/**
 * Parse a JS/TS file using @babel/parser and @babel/traverse.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {{ functions: [], classes: [], imports: [], exports: [], rawImports: [] }}
 */
function parseJsTs(filePath, content) {
  const functions = [];
  const classes = [];
  const imports = [];
  const exports = [];
  const rawImports = [];

  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      allowUndeclaredExports: true,
      errorRecovery: true,
      plugins: BABEL_PLUGINS,
    });
  } catch (parseErr) {
    // Retry without TypeScript plugin for plain JS files that have syntax issues
    try {
      ast = parser.parse(content, {
        sourceType: 'unambiguous',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        errorRecovery: true,
        plugins: ['jsx', 'objectRestSpread', 'dynamicImport'],
      });
    } catch (_) {
      console.warn(`[AstParser] Failed to parse ${filePath}: ${parseErr.message}`);
      return { functions, classes, imports, exports, rawImports };
    }
  }

  traverse(ast, {
    // ── Imports ──────────────────────────────────────────────────────────────
    ImportDeclaration(path) {
      const source = path.node.source.value;
      rawImports.push(source);
      const specifiers = path.node.specifiers.map((s) => {
        if (s.type === 'ImportDefaultSpecifier') return { type: 'default', name: s.local.name };
        if (s.type === 'ImportNamespaceSpecifier') return { type: 'namespace', name: s.local.name };
        return { type: 'named', name: s.imported ? s.imported.name : s.local.name, alias: s.local.name };
      });
      imports.push({ source, specifiers, line: path.node.loc?.start?.line });
    },

    // require() calls
    CallExpression(path) {
      const { callee, arguments: args } = path.node;
      if (
        callee.type === 'Identifier' &&
        callee.name === 'require' &&
        args.length === 1 &&
        args[0].type === 'StringLiteral'
      ) {
        const source = args[0].value;
        rawImports.push(source);
        imports.push({ source, specifiers: [], type: 'require', line: path.node.loc?.start?.line });
      }
    },

    // ── Exports ──────────────────────────────────────────────────────────────
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      const name =
        (decl && decl.id && decl.id.name) ||
        (decl && decl.type) ||
        'default';
      exports.push({ type: 'default', name, line: path.node.loc?.start?.line });
    },

    ExportNamedDeclaration(path) {
      const node = path.node;
      if (node.declaration) {
        const decl = node.declaration;
        if (decl.id) {
          exports.push({ type: 'named', name: decl.id.name, line: node.loc?.start?.line });
        } else if (decl.declarations) {
          decl.declarations.forEach((d) => {
            if (d.id && d.id.name) {
              exports.push({ type: 'named', name: d.id.name, line: node.loc?.start?.line });
            }
          });
        }
      }
      if (node.specifiers) {
        node.specifiers.forEach((s) => {
          exports.push({ type: 'named', name: s.exported.name, line: node.loc?.start?.line });
        });
      }
    },

    // ── Functions ─────────────────────────────────────────────────────────────
    FunctionDeclaration(path) {
      const node = path.node;
      const name = node.id ? node.id.name : '<anonymous>';
      const startLine = node.loc?.start?.line || 0;
      const endLine = node.loc?.end?.line || 0;
      const complexity = estimateComplexity(node, ast);
      functions.push({
        name,
        params: node.params ? node.params.length : 0,
        startLine,
        endLine,
        lines: endLine - startLine + 1,
        complexity,
        async: node.async || false,
        generator: node.generator || false,
      });
    },

    FunctionExpression(path) {
      const node = path.node;
      let name = '<anonymous>';
      // Try to infer name from parent
      const parent = path.parent;
      if (parent.type === 'VariableDeclarator' && parent.id) name = parent.id.name;
      else if (parent.type === 'AssignmentExpression' && parent.left) {
        name = parent.left.name || (parent.left.property && parent.left.property.name) || name;
      } else if (parent.type === 'Property' && parent.key) {
        name = parent.key.name || parent.key.value || name;
      } else if (parent.type === 'ObjectProperty' && parent.key) {
        name = parent.key.name || name;
      }

      const startLine = node.loc?.start?.line || 0;
      const endLine = node.loc?.end?.line || 0;
      const complexity = estimateComplexity(node, ast);
      functions.push({
        name,
        params: node.params ? node.params.length : 0,
        startLine,
        endLine,
        lines: endLine - startLine + 1,
        complexity,
        async: node.async || false,
        generator: node.generator || false,
      });
    },

    ArrowFunctionExpression(path) {
      const node = path.node;
      let name = '<arrow>';
      const parent = path.parent;
      if (parent.type === 'VariableDeclarator' && parent.id) name = parent.id.name;
      else if (parent.type === 'AssignmentExpression' && parent.left) {
        name = parent.left.name || name;
      } else if (parent.type === 'Property' && parent.key) {
        name = parent.key.name || parent.key.value || name;
      }

      const startLine = node.loc?.start?.line || 0;
      const endLine = node.loc?.end?.line || 0;
      const complexity = estimateComplexity(node, ast);
      functions.push({
        name,
        params: node.params ? node.params.length : 0,
        startLine,
        endLine,
        lines: endLine - startLine + 1,
        complexity,
        async: node.async || false,
        generator: false,
      });
    },

    // ── Classes ───────────────────────────────────────────────────────────────
    ClassDeclaration(path) {
      const node = path.node;
      const name = node.id ? node.id.name : '<AnonymousClass>';
      const superClass = node.superClass ? (node.superClass.name || 'unknown') : null;
      const methods = (node.body && node.body.body || [])
        .filter((m) => m.type === 'ClassMethod' || m.type === 'ClassPrivateMethod')
        .map((m) => ({
          name: m.key ? (m.key.name || m.key.id?.name || '<method>') : '<method>',
          kind: m.kind || 'method',
          static: m.static || false,
          complexity: estimateComplexity(m, ast),
        }));
      classes.push({
        name,
        superClass,
        methods,
        startLine: node.loc?.start?.line || 0,
        endLine: node.loc?.end?.line || 0,
      });
    },
  });

  return { functions, classes, imports, exports, rawImports };
}

// ── Python fallback (regex-based) ────────────────────────────────────────────
function parsePython(filePath, content) {
  const functions = [];
  const classes = [];
  const imports = [];
  const rawImports = [];

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // import x / from x import y
    const importMatch = line.match(/^\s*(?:from\s+(\S+)\s+)?import\s+(.+)/);
    if (importMatch) {
      const source = importMatch[1] || importMatch[2].split(',')[0].trim();
      rawImports.push(source);
      imports.push({ source, line: lineNum });
    }
    // def function
    const fnMatch = line.match(/^\s*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      functions.push({
        name: fnMatch[1],
        params: fnMatch[2] ? fnMatch[2].split(',').filter(Boolean).length : 0,
        startLine: lineNum,
        endLine: lineNum,
        lines: 1,
        complexity: 1,
        async: line.includes('async'),
      });
    }
    // class
    const clsMatch = line.match(/^\s*class\s+(\w+)/);
    if (clsMatch) {
      classes.push({ name: clsMatch[1], startLine: lineNum, endLine: lineNum, methods: [] });
    }
  });

  return { functions, classes, imports, exports: [], rawImports };
}

// ── Java fallback (regex-based) ───────────────────────────────────────────────
function parseJava(filePath, content) {
  const functions = [];
  const classes = [];
  const imports = [];
  const rawImports = [];

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const importMatch = line.match(/^\s*import\s+([\w.]+);/);
    if (importMatch) {
      rawImports.push(importMatch[1]);
      imports.push({ source: importMatch[1], line: lineNum });
    }
    const classMatch = line.match(/(?:public|private|protected)?\s*(?:abstract\s+)?class\s+(\w+)/);
    if (classMatch) {
      classes.push({ name: classMatch[1], startLine: lineNum, endLine: lineNum, methods: [] });
    }
    const methodMatch = line.match(
      /(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(([^)]*)\)/
    );
    if (methodMatch) {
      functions.push({
        name: methodMatch[1],
        params: methodMatch[2] ? methodMatch[2].split(',').filter(Boolean).length : 0,
        startLine: lineNum,
        endLine: lineNum,
        lines: 1,
        complexity: 1,
      });
    }
  });

  return { functions, classes, imports, exports: [], rawImports };
}

/**
 * Public entry point. Auto-detects language from filePath and dispatches.
 *
 * @param {string} filePath
 * @param {string} content
 * @param {string} [language] - optional language hint
 * @returns {{ functions, classes, imports, exports, rawImports }}
 */
function parseFile(filePath, content, language) {
  if (!content || content.trim() === '') {
    return { functions: [], classes: [], imports: [], exports: [], rawImports: [] };
  }

  const lang = language || '';
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  const isJsTs = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte'].includes(ext) ||
    ['javascript', 'typescript'].includes(lang);
  const isPython = ext === '.py' || lang === 'python';
  const isJava = ext === '.java' || lang === 'java';

  if (isJsTs) return parseJsTs(filePath, content);
  if (isPython) return parsePython(filePath, content);
  if (isJava) return parseJava(filePath, content);

  // Generic: return empty structure for unsupported types
  return { functions: [], classes: [], imports: [], exports: [], rawImports: [] };
}

module.exports = { parseFile, parseJsTs, parsePython, parseJava };
