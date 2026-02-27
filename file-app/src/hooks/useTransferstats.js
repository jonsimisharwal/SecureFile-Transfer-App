import { useState, useRef, useCallback } from 'react';

export function useTransferStats() {
  const [stats, setStats] = useState({
    percent: 0,
    speed:   0,
    eta:     null,
    loaded:  0,
    total:   0,
  });

  const startTimeRef    = useRef(null);
  const lastTimeRef     = useRef(null);
  const lastLoadedRef   = useRef(0);
  const samplesRef      = useRef([]);

  const reset = useCallback(() => {
    startTimeRef.current  = null;
    lastTimeRef.current   = null;
    lastLoadedRef.current = 0;
    samplesRef.current    = [];
    setStats({ percent:0, speed:0, eta:null, loaded:0, total:0 });
  }, []);

  const onProgress = useCallback((loaded, total) => {
    const now = Date.now();

    if (!startTimeRef.current) {
      startTimeRef.current  = now;
      lastTimeRef.current   = now;
      lastLoadedRef.current = 0;
    }

    const dt    = (now - lastTimeRef.current) / 1000;
    const delta = loaded - lastLoadedRef.current;

    // Always update percent and loaded/total even if dt is small
    const percent = total > 0 ? Math.min(Math.round((loaded / total) * 100), 99) : 0;

    if (dt >= 0.3 && delta > 0) {
      const instantSpeed = delta / dt;
      samplesRef.current.push(instantSpeed);
      if (samplesRef.current.length > 6) samplesRef.current.shift();
      const avgSpeed = samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length;
      const remaining = total - loaded;
      const eta = avgSpeed > 0 ? remaining / avgSpeed : null;

      setStats({ percent, speed: avgSpeed, eta, loaded, total });
      lastTimeRef.current   = now;
      lastLoadedRef.current = loaded;
    } else {
      // Update percent even if speed sample not ready yet
      setStats(prev => ({ ...prev, percent, loaded, total }));
    }
  }, []);

  return { stats, onProgress, reset };
}

export function formatSpeed(bps) {
  if (!bps || bps <= 0) return '—';
  if (bps >= 1024 * 1024) return (bps / (1024 * 1024)).toFixed(1) + ' MB/s';
  if (bps >= 1024)        return (bps / 1024).toFixed(0) + ' KB/s';
  return Math.round(bps) + ' B/s';
}

export function formatETA(seconds) {
  if (seconds === null || seconds === undefined || seconds < 0) return '—';
  if (seconds < 5)  return 'Almost done';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024**3)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024)        return (bytes / (1024**2)).toFixed(1) + ' MB';
  if (bytes >= 1024)               return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}