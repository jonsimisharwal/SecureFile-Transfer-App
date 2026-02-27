import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDownload } from '../hooks/useDownload';
import { useCountdown } from '../hooks/useCountDown';
import TransferStats from '../components/TransferStats';
import { formatBytes } from '../hooks/useTransferstats';

function getFileEmoji(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️';
  if (['mp4','mov','avi','mkv'].includes(ext)) return '🎬';
  if (['mp3','wav','flac','aac'].includes(ext)) return '🎵';
  if (ext === 'pdf') return '📕';
  if (['zip','rar','7z','tar'].includes(ext)) return '🗜️';
  return '📄';
}

function CountdownStrip({ expiresAt, onExpire }) {
  const { days, hours, minutes, seconds, isExpired, total_ms } = useCountdown(expiresAt);
  const calledExpire = useRef(false);
  const urgent = !isExpired && total_ms < 3600000;

  useEffect(() => {
    if (isExpired && !calledExpire.current) {
      calledExpire.current = true;
      onExpire?.();
    }
  }, [isExpired]);

  if (isExpired) return null;

  return (
    <div style={{ background:urgent?'rgba(240,201,78,0.05)':'var(--bg-elevated)', border:`1px solid ${urgent?'rgba(240,201,78,0.3)':'var(--border)'}`, borderRadius:'var(--radius)', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'0.1em' }}>FILE EXPIRES IN</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
        {[['DAYS',days],['HOURS',hours],['MINUTES',minutes],['SECONDS',seconds]].map(([label,value])=>(
          <div key={label} style={{ background:'var(--bg)', border:`1px solid ${urgent?'rgba(240,201,78,0.25)':'var(--border)'}`, borderRadius:'var(--radius-sm)', padding:'10px 6px', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:700, lineHeight:1, color:urgent?'var(--yellow)':'var(--accent)' }}>{String(value).padStart(2,'0')}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-muted)', marginTop:4, letterSpacing:'0.08em' }}>{label}</div>
          </div>
        ))}
      </div>
      {urgent && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--yellow)', textAlign:'center' }}>⚠️ Expiring soon — download now</div>}
    </div>
  );
}

export default function DownloadPage() {
  const { fileId } = useParams();
  const { download, fetchMetadata, metadata, progress, status, error, downloadStats, reset } = useDownload();
  const isWorking = ['loading-meta','downloading','decrypting'].includes(status);

  useEffect(() => { if (fileId) fetchMetadata(fileId); }, [fileId]);

  function handleExpired() { reset(); fetchMetadata(fileId); }

  const downloadSteps = [
    { label: 'FETCH',   state: progress > 0 ? (status==='decrypting'||status==='done' ? 'done' : 'active') : '' },
    { label: 'DECRYPT', state: status==='decrypting' ? 'active' : status==='done' ? 'done' : '' },
    { label: 'SAVE',    state: status==='done' ? 'done' : '' },
  ];

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (status==='loading-meta' && !metadata) {
    return (
      <div className="page"><div className="page-content">
        <div className="download-card">
          <div className="loading-state"><div className="loading-spinner"/>Fetching file metadata...</div>
        </div>
      </div></div>
    );
  }

  // ── ERROR / EXPIRED ───────────────────────────────────────────────────────
  if (status==='error') {
    const isExpiredMsg = error?.toLowerCase().includes('expir')||error?.toLowerCase().includes('deleted');
    return (
      <div className="page"><div className="page-content">
        <div className="page-header">
          <div className="header-badge">SECURE DOWNLOAD</div>
          <h1 className="page-title"><span className="title-accent">{isExpiredMsg?'File Expired':'Access Denied'}</span></h1>
        </div>
        <div className="download-card">
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, textAlign:'center', padding:'12px 0' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:isExpiredMsg?'rgba(240,201,78,0.1)':'var(--red-dim)', border:`2px solid ${isExpiredMsg?'var(--yellow)':'var(--red)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
              {isExpiredMsg?'⏰':'🔒'}
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:700, marginBottom:8, color:isExpiredMsg?'var(--yellow)':'var(--red)' }}>{isExpiredMsg?'This file has expired':'File Unavailable'}</div>
              <div style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.6 }}>{error}</div>
            </div>
            {isExpiredMsg && (
              <div style={{ padding:'12px 16px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>
                The file was automatically deleted from the server when its expiry time was reached.
              </div>
            )}
          </div>
        </div>
      </div></div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (status==='done') {
    return (
      <div className="page"><div className="page-content">
        <div className="download-card">
          <div className="done-view">
            <div className="done-icon">✓</div>
            <div>
              <div className="done-title">Decrypted</div>
              <div className="done-subtitle">Your file was decrypted entirely in your browser and saved to your device. The server never saw the original content.</div>
            </div>
            <div className="success-banner" style={{ width:'100%' }}>
              <div className="success-icon">🔓</div>
              <div>
                <div className="success-title">{metadata?.fileName}</div>
                <div className="success-sub">{formatBytes(metadata?.fileSize)} · Saved to downloads</div>
              </div>
            </div>
          </div>
        </div>
      </div></div>
    );
  }

  // ── MAIN DOWNLOAD VIEW ────────────────────────────────────────────────────
  return (
    <div className="page"><div className="page-content">
      <div className="page-header">
        <div className="header-badge">ZERO-KNOWLEDGE DOWNLOAD</div>
        <h1 className="page-title">Decrypt &amp;<br/><span className="title-accent">Download.</span></h1>
        <p className="page-subtitle">The file is decrypted entirely in your browser using the key in the URL fragment. The server never sees your data.</p>
      </div>

      <div className="download-card">
        {/* File preview */}
        {metadata && (
          <div className="file-preview">
            <div className="file-preview-icon">{getFileEmoji(metadata.fileName)}</div>
            <div>
              <div className="file-preview-name">{metadata.fileName}</div>
              <div className="file-preview-meta">
                <span>{formatBytes(metadata.fileSize)}</span>
                <span>⬇️ {metadata.downloadsRemaining} left</span>
              </div>
            </div>
          </div>
        )}

        {/* Live countdown */}
        {metadata?.expiresAt && !isWorking && status !== 'done' && (
          <CountdownStrip expiresAt={metadata.expiresAt} onExpire={handleExpired}/>
        )}

        {/* Crypto tags */}
        <div className="crypto-info">
          <span className="crypto-tag">🔑 AES-256-GCM</span>
          <span className="crypto-tag">🛡️ Zero-Knowledge</span>
          <span className="crypto-tag">🌐 Browser Decryption</span>
          <span className="crypto-tag">🔒 Key in #fragment</span>
        </div>

        {/* Transfer stats */}
        {isWorking && (
          <TransferStats
            stats={status==='downloading' ? downloadStats : { percent:progress, speed:0, eta:null, loaded:0, total:0 }}
            phase={status==='downloading' ? 'downloading' : status==='decrypting' ? 'decrypting' : 'loading-meta'}
            steps={downloadSteps}
          />
        )}

        {status==='error' && <div className="error-banner"><span>⚠️</span> {error}</div>}

        <button className="download-btn" onClick={()=>download(fileId)} disabled={isWorking||!metadata}>
          {isWorking ? <><div className="spinner"/> Working...</> : <><span className="btn-icon">🔓</span> Decrypt &amp; Download</>}
        </button>

        <p className="download-note">🔑 Decryption key is read from the URL fragment and never sent to any server</p>
      </div>
    </div></div>
  );
}