import { useState, useRef } from 'react';
import { useUpload } from '../hooks/useUpload';
import { useCountdown } from '../hooks/useCountDown';
import TransferStats from '../components/TransferStats';
import { formatBytes } from '../hooks/useTransferstats';

const EXPIRY_PRESETS = [
  { label: '1h',     value: 1 },
  { label: '24h',    value: 24 },
  { label: '72h',    value: 72 },
  { label: '7d',     value: 168 },
  { label: 'Custom', value: 'custom' },
];
const DOWNLOAD_OPTIONS = [1, 3, 5, 10];

function getFileEmoji(type = '') {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📕';
  if (type.includes('zip') || type.includes('rar')) return '🗜️';
  return '📄';
}
function toTotalHours({ days=0, hours=0, minutes=0, seconds=0 }) {
  return ((parseInt(days)||0)*86400+(parseInt(hours)||0)*3600+(parseInt(minutes)||0)*60+(parseInt(seconds)||0))/3600;
}
function customSummary({ days, hours, minutes, seconds }) {
  const p = [];
  if (parseInt(days))    p.push(`${days}d`);
  if (parseInt(hours))   p.push(`${hours}h`);
  if (parseInt(minutes)) p.push(`${minutes}m`);
  if (parseInt(seconds)) p.push(`${seconds}s`);
  return p.join(' ') || null;
}

function LiveBadge({ expiresAt }) {
  const { formatted, isExpired, total_ms } = useCountdown(expiresAt);
  const urgent = !isExpired && total_ms < 3600000;
  return (
    <span style={{ fontFamily:'var(--mono)', fontSize:11, color: isExpired?'var(--red)':urgent?'var(--yellow)':'var(--green)' }}>
      {isExpired ? '🔴 Expired' : `⏳ ${formatted}`}
    </span>
  );
}

function DoneCountdown({ expiresAt }) {
  const { days, hours, minutes, seconds, isExpired, total_ms } = useCountdown(expiresAt);
  const urgent = !isExpired && total_ms < 3600000;
  if (isExpired) return (
    <div style={{ width:'100%', padding:'14px 18px', background:'var(--red-dim)', border:'1px solid rgba(240,107,107,0.25)', borderRadius:'var(--radius-sm)', fontFamily:'var(--mono)', fontSize:13, color:'var(--red)', textAlign:'center' }}>
      🔴 File has expired and been deleted from server
    </div>
  );
  return (
    <div style={{ width:'100%', background:'var(--bg-elevated)', border:`1px solid ${urgent?'rgba(240,201,78,0.4)':'var(--border)'}`, borderRadius:'var(--radius)', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em' }}>FILE EXPIRES IN</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
        {[['DAYS',days],['HOURS',hours],['MINUTES',minutes],['SECONDS',seconds]].map(([label,value]) => (
          <div key={label} style={{ background:'var(--bg)', border:`1px solid ${urgent?'rgba(240,201,78,0.3)':'var(--border)'}`, borderRadius:'var(--radius-sm)', padding:'10px 6px', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:700, color:urgent?'var(--yellow)':'var(--accent)', lineHeight:1 }}>{String(value).padStart(2,'0')}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-muted)', marginTop:4, letterSpacing:'0.08em' }}>{label}</div>
          </div>
        ))}
      </div>
      {urgent && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--yellow)', textAlign:'center' }}>⚠️ Expiring soon — make sure recipient has the link</div>}
    </div>
  );
}

function HistoryCard({ meta, onRemove }) {
  const { isExpired } = useCountdown(meta.expiresAt);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--bg-elevated)', border:`1px solid ${isExpired?'var(--border)':'var(--border-bright)'}`, borderRadius:'var(--radius-sm)', opacity:isExpired?0.5:1, gap:12, transition:'opacity 0.5s' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'var(--sans)', fontSize:13, fontWeight:600, color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{meta.fileName}</div>
        <div style={{ display:'flex', gap:12, marginTop:4 }}>
          <LiveBadge expiresAt={meta.expiresAt} />
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)' }}>⬇️ {meta.maxDownloads}×</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center' }}>
        {!isExpired && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', background:'var(--accent-dim)', border:'1px solid rgba(91,142,240,0.2)', padding:'3px 8px', borderRadius:100 }}>ACTIVE</span>}
        <button onClick={() => onRemove(meta.fileId)}
          style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', borderRadius:'var(--radius-sm)', padding:'4px 8px', cursor:'pointer', fontSize:11, fontFamily:'var(--mono)' }}
          onMouseEnter={e=>{e.target.style.color='var(--red)';e.target.style.borderColor='var(--red)';}}
          onMouseLeave={e=>{e.target.style.color='var(--text-muted)';e.target.style.borderColor='var(--border)';}}>✕</button>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { upload, shareLink, currentMeta, uploadHistory, progress, status, error, phase, uploadStats, resetCurrent, removeFromHistory } = useUpload();

  const [copied, setCopied]             = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expiryMode, setExpiryMode]     = useState(24);
  const [customTime, setCustomTime]     = useState({ days:'', hours:'', minutes:'', seconds:'' });
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [dragging, setDragging]         = useState(false);
  const [fileError, setFileError]       = useState('');
  const inputRef = useRef();

  const isWorking       = status === 'encrypting' || status === 'uploading';
  const customTotalHours = toTotalHours(customTime);
  const customValid     = expiryMode === 'custom' ? customTotalHours >= (1/60) && customTotalHours <= 720 : true;
  const expiryHours     = expiryMode === 'custom' ? Math.min(Math.max(customTotalHours, 1/60), 720) : expiryMode;

  function handleCustomField(field, value) {
    if (value !== '' && (isNaN(value) || parseInt(value) < 0)) return;
    setCustomTime(prev => ({ ...prev, [field]: value }));
  }
  function handleFileChange(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 100*1024*1024) { setFileError('File too large. Max 100 MB.'); return; }
    setFileError(''); setSelectedFile(file);
  }
  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0]; if (!file) return;
    if (file.size > 100*1024*1024) { setFileError('File too large. Max 100 MB.'); return; }
    setFileError(''); setSelectedFile(file);
  }
  async function handleSubmit() {
    if (!selectedFile) return;
    if (expiryMode === 'custom' && !customValid) { setFileError('Enter valid expiry (min 1 minute).'); return; }
    await upload({ file: selectedFile, expiry: expiryHours, maxDownloads });
  }
  function copyLink() { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  function handleUploadAnother() {
    resetCurrent(); setSelectedFile(null); setCopied(false);
    setExpiryMode(24); setCustomTime({ days:'',hours:'',minutes:'',seconds:'' });
    setMaxDownloads(1); setFileError('');
  }

  const uploadSteps = [
    { label: 'KEYGEN',  state: progress>=5 ? (status==='uploading'?'done':'active') : '' },
    { label: 'ENCRYPT', state: progress>=20 ? (status==='uploading'?'done':'active') : '' },
    { label: 'UPLOAD',  state: status==='uploading' ? 'active' : '' },
  ];

  const inputStyle = { width:'100%', background:'var(--bg-elevated)', border:'1px solid var(--border-bright)', borderRadius:'var(--radius-sm)', color:'var(--text-primary)', fontFamily:'var(--mono)', fontSize:14, padding:'10px 8px 4px 8px', outline:'none', textAlign:'center', appearance:'none' };
  const inputLabelStyle = { fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', textAlign:'center', display:'block', marginTop:5, letterSpacing:'0.08em', textTransform:'uppercase' };

  // ── DONE VIEW ─────────────────────────────────────────────────────────────
  if (status === 'done' && shareLink) {
    return (
      <div className="page"><div className="page-content">
        <div className="upload-card">
          <div className="done-view">
            <div className="done-icon">✓</div>
            <div>
              <div className="done-title">Vault Sealed</div>
              <div className="done-subtitle">
                Encrypted in your browser. The key never touched the server.
                <strong style={{ color:'var(--yellow)', display:'block', marginTop:8 }}>⚠️ Copy this link now — won't show again after refresh.</strong>
              </div>
            </div>
            {currentMeta && <DoneCountdown expiresAt={currentMeta.expiresAt} />}
            {currentMeta && (
              <div style={{ width:'100%', display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:12 }}>
                <span style={{ color:'var(--text-secondary)' }}>📄 {currentMeta.fileName}</span>
                <span style={{ color:'var(--accent)' }}>⬇️ {currentMeta.maxDownloads}× max</span>
              </div>
            )}
            <div className="share-box" style={{ width:'100%' }}>
              <div className="share-box-header">
                <div className="share-status"><div className="status-dot"/>Encrypted &amp; Stored</div>
              </div>
              <div className="share-warning">
                <span className="warn-icon">⚠️</span>
                <p>The <strong>#key</strong> in this link is your decryption key. Never stored anywhere — this is the only time it appears.</p>
              </div>
              <div className="share-link-row">
                <div className="share-link-text">{shareLink}</div>
                <button className={`copy-btn ${copied?'copied':''}`} onClick={copyLink}>{copied?'✓ Copied':'📋 Copy'}</button>
              </div>
              <div className="share-note">🔑 KEY IN MEMORY ONLY · NEVER STORED · AES-256-GCM</div>
            </div>
            <button className="upload-btn" onClick={handleUploadAnother}><span className="btn-icon">+</span> Upload Another File</button>
          </div>
        </div>
        {uploadHistory.filter(m=>m.fileId!==currentMeta?.fileId).length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>Previous Uploads</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {uploadHistory.filter(m=>m.fileId!==currentMeta?.fileId).map(meta=>(
                <HistoryCard key={meta.fileId} meta={meta} onRemove={removeFromHistory}/>
              ))}
            </div>
          </div>
        )}
      </div></div>
    );
  }

  // ── UPLOAD FORM ───────────────────────────────────────────────────────────
  return (
    <div className="page"><div className="page-content">
      <div className="page-header">
        <div className="header-badge">AES-256-GCM · ZERO KNOWLEDGE</div>
        <h1 className="page-title">Drop your file.<br/><span className="title-accent">We encrypt it.</span></h1>
        <p className="page-subtitle">Files are encrypted in your browser before upload. The server only stores encrypted bytes — your key never leaves your device.</p>
      </div>

      <div className="upload-card">
        {/* Drop Zone */}
        <div className={`drop-zone ${dragging?'dragging':''} ${selectedFile?'has-file':''} ${isWorking?'disabled':''}`}
          onClick={()=>!isWorking&&inputRef.current.click()}
          onDragOver={(e)=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={handleDrop}>
          <input ref={inputRef} type="file" style={{ display:'none' }} onChange={handleFileChange}/>
          {!selectedFile ? (
            <>
              <div className="drop-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="drop-primary">Drop file here or <span className="drop-link">browse</span></div>
              <div className="drop-secondary">Any file type · Max 100 MB</div>
            </>
          ) : (
            <div className="file-info">
              <div className="file-icon-large">{getFileEmoji(selectedFile.type)}</div>
              <div className="file-details">
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">{formatBytes(selectedFile.size)}</div>
                <div className="file-type">{selectedFile.type||'unknown'}</div>
              </div>
              {!isWorking && <button className="change-file-btn" onClick={(e)=>{e.stopPropagation();inputRef.current.click();}}>Change</button>}
            </div>
          )}
        </div>

        {fileError && <div className="uploader-error">{fileError}</div>}

        {/* Expiry */}
        <div className="expiry-selector">
          <div className="expiry-label"><span className="label-icon">⏳</span> Expires After</div>
          <div className="expiry-options">
            {EXPIRY_PRESETS.map(opt=>(
              <button key={opt.value} className={`expiry-btn ${expiryMode===opt.value?'active':''}`} onClick={()=>setExpiryMode(opt.value)} disabled={isWorking}>{opt.label}</button>
            ))}
          </div>
          {expiryMode==='custom' && (
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                {[{field:'days',max:30},{field:'hours',max:23},{field:'minutes',max:59},{field:'seconds',max:59}].map(({field,max})=>(
                  <div key={field}>
                    <input type="number" min={0} max={max} placeholder="0" value={customTime[field]} onChange={(e)=>handleCustomField(field,e.target.value)} disabled={isWorking} style={inputStyle}/>
                    <span style={inputLabelStyle}>{field}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg)', border:`1px solid ${customValid&&customTotalHours>0?'var(--accent)':'var(--border)'}`, borderRadius:'var(--radius-sm)' }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)' }}>TOTAL EXPIRY</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:customValid&&customTotalHours>0?'var(--accent)':'var(--text-muted)' }}>
                  {customTotalHours>0&&customValid ? customSummary(customTime)||'—' : customTotalHours>0&&!customValid ? '⚠️ Min 1 minute' : '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Max Downloads */}
        <div className="expiry-selector">
          <div className="expiry-label"><span className="label-icon">⬇️</span> Max Downloads</div>
          <div className="expiry-options">
            {DOWNLOAD_OPTIONS.map(n=>(
              <button key={n} className={`expiry-btn ${maxDownloads===n?'active':''}`} onClick={()=>setMaxDownloads(n)} disabled={isWorking}>{n}×</button>
            ))}
          </div>
        </div>

        {/* Transfer stats (speed + progress) */}
        {isWorking && (
          <TransferStats
            stats={phase === 'uploading' ? uploadStats : { percent: progress, speed: 0, eta: null, loaded: 0, total: 0 }}
            phase={phase}
            steps={uploadSteps}
          />
        )}

        {status==='error' && <div className="error-banner"><span>⚠️</span> {error}</div>}

        <button className="upload-btn" onClick={handleSubmit} disabled={!selectedFile||isWorking||(expiryMode==='custom'&&!customValid)}>
          {isWorking ? <><div className="spinner"/> Processing...</> : <><span className="btn-icon">🔒</span> Encrypt &amp; Upload</>}
        </button>
      </div>

      {uploadHistory.length > 0 && status !== 'done' && (
        <div style={{ marginTop:32 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12, display:'flex', justifyContent:'space-between' }}>
            <span>Upload History ({uploadHistory.length})</span>
            <span style={{ fontSize:10 }}>Links not stored — copy from original tab</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {uploadHistory.map(meta=><HistoryCard key={meta.fileId} meta={meta} onRemove={removeFromHistory}/>)}
          </div>
        </div>
      )}
    </div></div>
  );
}