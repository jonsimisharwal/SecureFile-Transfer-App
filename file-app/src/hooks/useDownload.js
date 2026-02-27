import { useState, useCallback } from 'react';
import { importKeyFromString, decryptFile, unpackEncryptedPayload } from '../services/crypto';
import { getFileMetadata } from '../services/api';
import { useTransferStats } from './useTransferstats';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Download with byte-level progress
async function downloadWithProgress(fileId, onProgress) {
  const res = await fetch(`${BASE_URL}/api/files/${fileId}/download`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to download file.');
  }

  const contentLength = res.headers.get('Content-Length');
  const total         = contentLength ? parseInt(contentLength, 10) : null;
  const reader        = res.body.getReader();
  const chunks        = [];
  let loaded          = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total) onProgress(loaded, total);
  }

  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
  return combined.buffer;
}

export function useDownload() {
  const [metadata, setMetadata] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status,   setStatus]   = useState('idle');
  const [error,    setError]    = useState(null);

  const { stats: downloadStats, onProgress: onDownloadProgress, reset: resetStats } = useTransferStats();

  const reset = useCallback(() => {
    setMetadata(null); setProgress(0);
    setStatus('idle'); setError(null);
    resetStats();
  }, [resetStats]);

  const fetchMetadata = useCallback(async (fileId) => {
    try {
      setStatus('loading-meta'); setError(null);
      const meta = await getFileMetadata(fileId);
      setMetadata(meta);
      setStatus('idle');
      return meta;
    } catch (err) {
      setError(err.message || 'File not found or has expired.');
      setStatus('error');
      throw err;
    }
  }, []);

  const download = useCallback(async (fileId) => {
    try {
      resetStats();
      setProgress(0); setError(null);

      const keyStr = window.location.hash.replace('#key=', '');
      if (!keyStr) throw new Error('Decryption key missing from URL.');

      // Fetch metadata
      setStatus('loading-meta');
      const meta = await getFileMetadata(fileId);
      setMetadata(meta);

      // Download with byte progress
      setStatus('downloading');
      const encryptedBuffer = await downloadWithProgress(fileId, (loaded, total) => {
        onDownloadProgress(loaded, total);
        setProgress(Math.round((loaded / total) * 80)); // 0–80%
      });

      // Decrypt
      setStatus('decrypting');
      setProgress(85);
      const key = await importKeyFromString(keyStr);
      const { iv, encryptedData } = unpackEncryptedPayload(encryptedBuffer);
      setProgress(92);
      const decryptedBuffer = await decryptFile(encryptedData, key, iv);
      setProgress(97);

      // Save
      const blob = new Blob([decryptedBuffer], { type: meta.mimeType || 'application/octet-stream' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = meta.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('done');
      setProgress(100);
    } catch (err) {
      setError(err.name === 'OperationError'
        ? 'Decryption failed — wrong key or corrupted file.'
        : err.message || 'Download failed.');
      setStatus('error');
      throw err;
    }
  }, [resetStats, onDownloadProgress]);

  return { download, fetchMetadata, metadata, progress, status, error, downloadStats, reset };
}