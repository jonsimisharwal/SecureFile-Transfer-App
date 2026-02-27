import { useState, useCallback, useEffect } from 'react';
import { generateKey, exportKeyToString, encryptFile, packEncryptedPayload } from '../services/crypto';
import { useTransferStats } from './useTransferstats';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
const BASE_URL     = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const STORAGE_KEY  = 'vaultdrop_uploads';

function loadAllMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    const valid = list.filter(m => m.expiresAt && new Date(m.expiresAt) > new Date());
    if (valid.length !== list.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    return valid;
  } catch { localStorage.removeItem(STORAGE_KEY); return []; }
}

function appendSafeMeta(meta) {
  try {
    const existing = loadAllMeta();
    const updated  = [...existing.filter(m => m.fileId !== meta.fileId), meta];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

function removeMeta(fileId) {
  try {
    const existing = loadAllMeta();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter(m => m.fileId !== fileId)));
  } catch {}
}

// XHR upload with byte-level progress reporting
function xhrUpload({ formData, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 201) resolve(data);
        else reject(new Error(data.error || 'Upload failed.'));
      } catch { reject(new Error('Invalid server response.')); }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

    xhr.open('POST', `${BASE_URL}/api/files`);
    xhr.send(formData);
  });
}

export function useUpload() {
  const [shareLink,     setShareLink]     = useState(null);
  const [progress,      setProgress]      = useState(0);
  const [status,        setStatus]        = useState('idle');
  const [error,         setError]         = useState(null);
  const [currentMeta,   setCurrentMeta]   = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [phase,         setPhase]         = useState(''); // 'encrypting' | 'uploading'

  const { stats: uploadStats, onProgress: onUploadProgress, reset: resetStats } = useTransferStats();

  useEffect(() => { setUploadHistory(loadAllMeta()); }, []);

  const refreshHistory  = useCallback(() => setUploadHistory(loadAllMeta()), []);
  const removeFromHistory = useCallback((fileId) => {
    removeMeta(fileId);
    setUploadHistory(prev => prev.filter(m => m.fileId !== fileId));
  }, []);

  const resetCurrent = useCallback(() => {
    setShareLink(null); setProgress(0); setStatus('idle');
    setError(null); setCurrentMeta(null); setPhase('');
    resetStats();
  }, [resetStats]);

  const upload = useCallback(async ({ file, expiry = 24, maxDownloads = 1 }) => {
    try {
      resetCurrent();

      // ── Step 1: Keygen ────────────────────────────────────────
      setStatus('encrypting'); setPhase('encrypting'); setProgress(2);
      const key    = await generateKey();
      const keyStr = await exportKeyToString(key);

      // ── Step 2: Read file ─────────────────────────────────────
      const fileBuffer = await file.arrayBuffer();
      setProgress(8);

      // ── Step 3: Encrypt ───────────────────────────────────────
      const { encryptedData, iv } = await encryptFile(fileBuffer, key);
      setProgress(18);

      // ── Step 4: Pack IV + data ────────────────────────────────
      const packedBuffer = packEncryptedPayload(iv, encryptedData);
      setProgress(20);

      // ── Step 5: Upload with byte-level progress ───────────────
      setStatus('uploading'); setPhase('uploading');

      const formData = new FormData();
      formData.append('encryptedFile', new Blob([packedBuffer], { type: 'application/octet-stream' }), file.name);
      formData.append('iv',           'packed');
      formData.append('fileName',     file.name);
      formData.append('mimeType',     file.type || 'application/octet-stream');
      formData.append('expiry',       String(expiry));
      formData.append('maxDownloads', String(maxDownloads));

      const { fileId } = await xhrUpload({
        formData,
        onProgress: (loaded, total) => {
          onUploadProgress(loaded, total);
          // Map 20–99 range
          setProgress(20 + Math.round((loaded / total) * 79));
        },
      });

      // ── Step 6: Build link ────────────────────────────────────
      const link      = `${FRONTEND_URL}/download/${fileId}#key=${keyStr}`;
      const expiresAt = new Date(Date.now() + expiry * 60 * 60 * 1000).toISOString();
      const meta      = { fileId, fileName: file.name, expiresAt, maxDownloads };

      appendSafeMeta(meta);
      setUploadHistory(loadAllMeta());
      setShareLink(link);
      setCurrentMeta(meta);
      setStatus('done');
      setProgress(100);

      return { fileId, shareLink: link };
    } catch (err) {
      setError(err.message || 'Upload failed.');
      setStatus('error');
      throw err;
    }
  }, [resetCurrent, onUploadProgress]);

  return {
    upload, shareLink, currentMeta, uploadHistory,
    progress, status, error, phase, uploadStats,
    resetCurrent, removeFromHistory, refreshHistory,
  };
}