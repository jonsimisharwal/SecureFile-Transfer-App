// ShareLinkBox.jsx — Display & copy the share link after upload
import { useState } from "react";

export default function ShareLinkBox({ link, expiresAt }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleString() : null;

  return (
    <div className="share-box">
      <div className="share-box-header">
        <div className="share-status">
          <span className="status-dot"></span>
          <span>File encrypted &amp; uploaded</span>
        </div>
        {expiryDate && (
          <span className="share-expiry">Expires {expiryDate}</span>
        )}
      </div>

      <div className="share-warning">
        <span className="warn-icon">🔑</span>
        <p>
          The decryption key is embedded in the link. Anyone with this link can
          decrypt the file — share it securely.
        </p>
      </div>

      <div className="share-link-row">
        <div className="share-link-text">{link}</div>
        <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy}>
          {copied ? (
            <>
              <span>✓</span> Copied!
            </>
          ) : (
            <>
              <span>⧉</span> Copy
            </>
          )}
        </button>
      </div>

      <div className="share-note">
        🔒 Zero-knowledge — the server never sees your decryption key
      </div>
    </div>
  );
}
