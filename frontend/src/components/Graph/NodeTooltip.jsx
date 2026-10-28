const LANG_COLORS = {
  javascript:'#f7df1e', typescript:'#60a5fa', python:'#34d399',
  java:'#fb923c', go:'#22d3ee', rust:'#fdba74',
  html:'#f97316', css:'#c084fc', json:'#94a3b8', unknown:'#475569',
}

function getRisk(c) {
  if (c <= 3)  return { label:'Low',      color:'#34d399', bg:'rgba(52,211,153,0.12)' }
  if (c <= 7)  return { label:'Moderate', color:'#fbbf24', bg:'rgba(251,191,36,0.12)' }
  if (c <= 15) return { label:'High',     color:'#f97316', bg:'rgba(249,115,22,0.12)' }
  return             { label:'Critical',  color:'#ef4444', bg:'rgba(239,68,68,0.12)'  }
}

export default function NodeTooltip({ node, x, y, circularFileSet }) {
  if (!node) return null

  const isCircular = circularFileSet?.has(node.id)
  const risk = getRisk(node.avgComplexity || 1)
  const langColor = LANG_COLORS[node.language] || '#94a3b8'
  const topFns = (node.functions || [])
    .sort((a,b) => (b.complexity||1)-(a.complexity||1))
    .slice(0, 5)

  // keep tooltip inside viewport
  const vpW = window.innerWidth
  const vpH = window.innerHeight
  const tipW = 260
  const tipH = 220
  const left = x + 14 + tipW > vpW ? x - tipW - 14 : x + 14
  const top  = y + tipH > vpH     ? y - tipH         : y

  return (
    <div style={{
      position: 'fixed',
      left, top,
      width: tipW,
      background: 'rgba(8,8,22,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '12px 14px',
      fontSize: 12,
      pointerEvents: 'none',
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* File name */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <div style={{
          width:10, height:10, borderRadius:'50%',
          background:langColor,
          boxShadow:`0 0 8px ${langColor}`,
          flexShrink:0,
        }}/>
        <div style={{fontWeight:700, color:'#e2e8f0', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
          {node.name || node.path.split('/').pop()}
        </div>
      </div>

      {/* Path */}
      <div style={{fontSize:10, color:'#475569', marginBottom:10, wordBreak:'break-all', lineHeight:1.4}}>
        {node.path}
      </div>

      {/* Tags row */}
      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
        <Tag color={langColor}>{node.language}</Tag>
        <Tag color={risk.color} bg={risk.bg}>⚡ {risk.label} ({node.avgComplexity || 1})</Tag>
        {isCircular && <Tag color='#ef4444' bg='rgba(239,68,68,0.12)'>♻ Circular</Tag>}
      </div>

      {/* Stats grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px 16px',marginBottom:8}}>
        <Stat label="Lines"     value={node.lines||0}         />
        <Stat label="Imports"   value={node.importCount||0}   />
        <Stat label="Functions" value={(node.functions||[]).length} />
        <Stat label="In-degree" value={node.inDegree||0}  color="#a78bfa" />
      </div>

      {/* Top functions */}
      {topFns.length > 0 && (
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:8}}>
          <div style={{fontSize:9,color:'#475569',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:5}}>
            Top Functions
          </div>
          {topFns.map((fn,i)=>{
            const fr = getRisk(fn.complexity||1)
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0'}}>
                <span style={{color:'#60a5fa',fontSize:10,fontFamily:'monospace'}}>ƒ</span>
                <span style={{flex:1,color:'#94a3b8',fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {fn.name}
                </span>
                <span style={{color:fr.color,fontSize:10,fontWeight:700,flexShrink:0}}>
                  {fn.complexity||1}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Tag({ children, color, bg }) {
  return (
    <span style={{
      background: bg || `${color}18`,
      color, border:`1px solid ${color}30`,
      borderRadius:999, padding:'2px 8px', fontSize:10, fontWeight:600,
    }}>
      {children}
    </span>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,color:color||'#e2e8f0',lineHeight:1.3}}>{value}</div>
    </div>
  )
}
