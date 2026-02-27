import { formatSpeed, formatETA, formatBytes } from '../hooks/useTransferstats';

export default function TransferStats({ stats = {}, phase, steps = [] }) {
  const {
    percent = 0,
    speed   = 0,
    eta     = null,
    loaded  = 0,
    total   = 0,
  } = stats;

  const phaseLabel = {
    encrypting:   '🔐 Encrypting in browser...',
    uploading:    '⬆️  Uploading...',
    'loading-meta': '🔍 Fetching metadata...',
    downloading:  '⬇️  Downloading...',
    decrypting:   '🔓 Decrypting in browser...',
  }[phase] || 'Processing...';

  const showSpeedRow = phase === 'uploading' || phase === 'downloading';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Phase label + percent */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'var(--mono)', fontSize:12, color:'var(--text-secondary)' }}>
          <div className="spinner"/>
          {phaseLabel}
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)', fontWeight:700 }}>
          {percent}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:6, background:'var(--bg-elevated)', borderRadius:3, overflow:'hidden', border:'1px solid var(--border)' }}>
        <div style={{
          height:'100%',
          width:`${percent}%`,
          background:'linear-gradient(90deg, var(--accent), #a78bfa)',
          borderRadius:3,
          transition:'width 0.25s ease',
          boxShadow:'0 0 12px rgba(91,142,240,0.4)',
        }}/>
      </div>

      {/* Speed / ETA / Size — always shown during upload/download */}
      {showSpeedRow && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[
            { label:'SPEED', value: speed > 100 ? formatSpeed(speed) : '—' },
            { label:'ETA',   value: percent >= 99 ? 'Done' : eta !== null ? formatETA(eta) : '—' },
            { label:'SIZE',  value: total > 0 ? `${formatBytes(loaded)} / ${formatBytes(total)}` : loaded > 0 ? formatBytes(loaded) : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background:'var(--bg)',
              border:'1px solid var(--border)',
              borderRadius:'var(--radius-sm)',
              padding:'10px 8px',
              textAlign:'center',
            }}>
              <div style={{
                fontFamily:'var(--mono)',
                fontSize:13,
                fontWeight:700,
                color: label==='SPEED' ? 'var(--accent)' : label==='ETA' ? 'var(--text-primary)' : 'var(--text-secondary)',
                lineHeight:1,
                whiteSpace:'nowrap',
                overflow:'hidden',
                textOverflow:'ellipsis',
              }}>
                {value}
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-muted)', marginTop:5, letterSpacing:'0.08em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step indicators */}
      {steps.length > 0 && (
        <div style={{ display:'flex', gap:20 }}>
          {steps.map(({ label, state }) => (
            <div key={label} className={`step ${state}`}>
              <div className="step-dot"/> {label}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}