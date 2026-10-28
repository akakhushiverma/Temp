import { useRepoStore } from '../../store/repoStore'

export default function MetricsPanel() {
  const { selectedFile, selectedFileContent, graphData } = useRepoStore()
  const node = graphData?.nodes?.find((n) => n.id === selectedFile)
  if (!node || !selectedFileContent) return null

  const { tokens, lines } = selectedFileContent
  const fns = node.functions || []
  const maxComplexity = fns.length ? Math.max(...fns.map((f) => f.complexity || 1)) : 1

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <div className="section-title">File Metrics</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Lines', value: lines },
          { label: 'Tokens', value: tokens?.toLocaleString() },
          { label: 'Functions', value: fns.length },
          { label: 'Classes', value: (node.classes || []).length },
          { label: 'Imports', value: node.importCount || 0 },
          { label: 'Max CC', value: maxComplexity },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '6px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
