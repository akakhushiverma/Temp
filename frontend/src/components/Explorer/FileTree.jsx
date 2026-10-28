import { useState, useMemo } from 'react'
import { useRepoStore } from '../../store/repoStore'

const LANG_ICONS = {
  javascript: '🟨',
  typescript: '🟦',
  python: '🐍',
  java: '☕',
  go: '🔵',
  rust: '🦀',
  html: '🌐',
  css: '🎨',
  json: '📋',
  markdown: '📝',
  unknown: '📄',
}

const RISK_COLORS = {
  low: '#10b981',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

function getRiskColor(complexity) {
  if (complexity <= 5) return RISK_COLORS.low
  if (complexity <= 10) return RISK_COLORS.moderate
  if (complexity <= 20) return RISK_COLORS.high
  return RISK_COLORS.critical
}

function buildTree(files) {
  const root = { name: '', children: {}, files: [], path: '' }

  for (const file of files) {
    const parts = file.path.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!node.children[part]) {
        node.children[part] = {
          name: part,
          children: {},
          files: [],
          path: parts.slice(0, i + 1).join('/'),
        }
      }
      node = node.children[part]
    }
    node.files.push(file)
  }

  return root
}

function FolderNode({ folder, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2)
  const { selectedFile, setSelectedNode } = useRepoStore()

  const childFolders = Object.values(folder.children)
  const hasContent = childFolders.length > 0 || folder.files.length > 0

  if (!hasContent && !folder.name) return null

  return (
    <div>
      {folder.name && (
        <div
          className="file-tree-item"
          style={{ paddingLeft: depth * 12 + 6 }}
          onClick={() => setOpen(!open)}
          role="button"
          aria-expanded={open}
        >
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{open ? '▾' : '▸'}</span>
          <span className="file-tree-icon">📁</span>
          <span className="file-tree-name" style={{ color: 'var(--text-secondary)' }}>{folder.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{folder.files.length + Object.keys(folder.children).length}</span>
        </div>
      )}
      {(open || !folder.name) && (
        <>
          {childFolders.map((child) => (
            <FolderNode key={child.path} folder={child} depth={depth + 1} />
          ))}
          {folder.files.map((file) => (
            <FileNode key={file.path} file={file} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  )
}

function FileNode({ file, depth }) {
  const { selectedFile, setSelectedNode, graphData } = useRepoStore()
  const isSelected = selectedFile === file.path

  const nodeData = useMemo(
    () => graphData?.nodes?.find((n) => n.id === file.path),
    [graphData, file.path]
  )
  const complexity = nodeData?.avgComplexity || 0

  return (
    <div
      className={`file-tree-item ${isSelected ? 'selected' : ''}`}
      style={{ paddingLeft: depth * 12 + 6 }}
      onClick={() => setSelectedNode(file.path)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setSelectedNode(file.path)}
    >
      <span className="file-tree-icon">{LANG_ICONS[file.language] || '📄'}</span>
      <span className="file-tree-name">{file.path.split('/').pop()}</span>
      {complexity > 0 && (
        <span
          className="file-tree-badge"
          style={{ background: `${getRiskColor(complexity)}22`, color: getRiskColor(complexity) }}
          title={`Complexity: ${complexity}`}
        >
          {Math.round(complexity)}
        </span>
      )}
    </div>
  )
}

export default function FileTree() {
  const { fileTree } = useRepoStore()
  const [filter, setFilter] = useState('')

  const filteredTree = useMemo(() => {
    if (!filter) return fileTree
    return fileTree.filter((f) => f.path.toLowerCase().includes(filter.toLowerCase()))
  }, [fileTree, filter])

  const tree = useMemo(() => buildTree(filteredTree), [filteredTree])

  if (!fileTree.length) {
    return <div className="no-data">No files loaded</div>
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Filter files…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
          borderRadius: 6, color: 'var(--text-primary)', padding: '5px 10px', fontSize: 12,
          outline: 'none', marginBottom: 8,
        }}
      />
      <FolderNode folder={tree} depth={0} />
    </div>
  )
}
