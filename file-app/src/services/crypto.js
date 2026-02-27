// crypto.js — Zero-knowledge AES-256-GCM encryption
// All encryption/decryption happens exclusively in the browser

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV for AES-GCM

/**
 * Generate a random AES-256 key
 * @returns {Promise<CryptoKey>}
 */
export async function generateKey() {
  return await window.crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Export a CryptoKey to a base64url string for embedding in URL hash
 * @param {CryptoKey} key
 * @returns {Promise<string>} base64url-encoded key
 */
export async function exportKeyToString(key) {
  const raw = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64url(raw);
}

/**
 * Import a base64url string back into a CryptoKey
 * @param {string} keyStr
 * @returns {Promise<CryptoKey>}
 */
export async function importKeyFromString(keyStr) {
  const raw = base64urlToArrayBuffer(keyStr);
  return await window.crypto.subtle.importKey(
    "raw",
    raw,
    { name: ALGORITHM },
    false,
    ["decrypt"]
  );
}

/**
 * Encrypt a file (ArrayBuffer) with AES-256-GCM
 * @param {ArrayBuffer} fileBuffer
 * @param {CryptoKey} key
 * @returns {Promise<{ encryptedData: ArrayBuffer, iv: Uint8Array }>}
 */
export async function encryptFile(fileBuffer, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    fileBuffer
  );

  return { encryptedData, iv };
}

/**
 * Decrypt an encrypted ArrayBuffer with AES-256-GCM
 * @param {ArrayBuffer} encryptedData
 * @param {CryptoKey} key
 * @param {Uint8Array} iv
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptFile(encryptedData, key, iv) {
  return await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedData
  );
}

/**
 * Pack IV + encrypted data into a single ArrayBuffer for transport
 * Layout: [12 bytes IV][...encrypted data]
 * @param {Uint8Array} iv
 * @param {ArrayBuffer} encryptedData
 * @returns {ArrayBuffer}
 */
export function packEncryptedPayload(iv, encryptedData) {
  const packed = new Uint8Array(IV_LENGTH + encryptedData.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(encryptedData), IV_LENGTH);
  return packed.buffer;
}

/**
 * Unpack IV + encrypted data from a packed ArrayBuffer
 * @param {ArrayBuffer} packed
 * @returns {{ iv: Uint8Array, encryptedData: ArrayBuffer }}
 */
export function unpackEncryptedPayload(packed) {
  const arr = new Uint8Array(packed);
  const iv = arr.slice(0, IV_LENGTH);
  const encryptedData = arr.slice(IV_LENGTH).buffer;
  return { iv, encryptedData };
}

// --- Utilities ---

function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlToArrayBuffer(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
