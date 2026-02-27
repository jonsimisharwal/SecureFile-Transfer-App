/**
 * api.js
 * All communication with the backend.
 * Server only ever receives/sends encrypted bytes — never plaintext.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Upload Encrypted File ────────────────────────────────────────────────────

/**
 * Upload an encrypted file blob to the backend.
 *
 * @param {Object} params
 * @param {ArrayBuffer} params.encryptedBuffer - AES-GCM encrypted bytes
 * @param {string}      params.ivHex           - IV hex string
 * @param {string}      params.fileName        - Original file name
 * @param {string}      params.mimeType        - Original MIME type
 * @param {number}      params.expiry          - Hours until expiry (1–168)
 * @param {number}      params.maxDownloads    - Max downloads allowed (1–100)
 * @param {Function}    params.onProgress      - Upload progress callback (0–100)
 *
 * @returns {Promise<{ fileId: string }>}
 */
export function uploadEncryptedFile({
  encryptedBuffer,
  ivHex,
  fileName,
  mimeType,
  expiry,
  maxDownloads,
  onProgress,
}) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();

    // Attach encrypted blob as a file field
    const encryptedBlob = new Blob([encryptedBuffer], {
      type: 'application/octet-stream',
    });
    formData.append('encryptedFile', encryptedBlob, fileName);

    // Metadata fields (NO encryption key ever sent)
    formData.append('iv', ivHex);
    formData.append('fileName', fileName);
    formData.append('mimeType', mimeType || 'application/octet-stream');
    formData.append('expiry', String(expiry));
    formData.append('maxDownloads', String(maxDownloads));

    // Use XHR for upload progress tracking
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 201) {
          resolve(data);
        } else {
          reject(new Error(data.error || 'Upload failed.'));
        }
      } catch {
        reject(new Error('Invalid server response.'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

    xhr.open('POST', `${BASE_URL}/api/files`);
    xhr.send(formData);
  });
}

// ─── Get File Metadata ────────────────────────────────────────────────────────

/**
 * Fetch file metadata by fileId.
 * Returns: fileName, iv, storageUrl, fileSize, mimeType, expiresAt, downloadsRemaining
 *
 * @param {string} fileId
 * @returns {Promise<Object>}
 */
export async function getFileMetadata(fileId) {
  const res = await fetch(`${BASE_URL}/api/files/${fileId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch file metadata.');
  }

  return data;
}

// ─── Download Encrypted File ──────────────────────────────────────────────────

/**
 * Download the raw encrypted bytes from the server.
 * The returned ArrayBuffer must be decrypted in the browser before use.
 *
 * @param {string}   fileId
 * @param {Function} onProgress - Download progress callback (0–100)
 * @returns {Promise<ArrayBuffer>} Raw encrypted bytes
 */
export async function downloadEncryptedFile(fileId, onProgress) {
  const res = await fetch(`${BASE_URL}/api/files/${fileId}/download`, {
    method: 'GET',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to download file.');
  }

  // Stream with progress tracking
  const contentLength = res.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : null;

  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total && onProgress) {
      onProgress(Math.round((loaded / total) * 100));
    }
  }

  // Combine chunks into a single ArrayBuffer
  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined.buffer;
}