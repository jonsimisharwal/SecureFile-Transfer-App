// FileUploader.jsx — Drag & drop file selection
import { useState, useRef, useCallback } from "react";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function FileUploader({ onFileSelect, selectedFile, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const validateAndSelect = useCallback((file) => {
    setError(null);
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`);
      return;
    }
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }, [disabled, validateAndSelect]);

  const handleDragOver = (e) => { e.preventDefault(); if (!disabled) setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleInputChange = (e) => { if (e.target.files[0]) validateAndSelect(e.target.files[0]); };

  return (
    <div className="uploader-wrapper">
      <div
        className={`drop-zone ${isDragging ? "dragging" : ""} ${selectedFile ? "has-file" : ""} ${disabled ? "disabled" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        aria-label="Drop file here or click to select"
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleInputChange}
          disabled={disabled}
          aria-hidden="true"
        />

        {selectedFile ? (
          <div className="file-info">
            <div className="file-icon-large">
              {getFileIcon(selectedFile.name)}
            </div>
            <div className="file-details">
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-size">{formatBytes(selectedFile.size)}</div>
              <div className="file-type">{selectedFile.type || "Unknown type"}</div>
            </div>
            {!disabled && (
              <button
                className="change-file-btn"
                onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
                type="button"
              >
                Change
              </button>
            )}
          </div>
        ) : (
          <div className="drop-prompt">
            <div className="drop-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L24 32M24 4L14 14M24 4L34 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 36V42H42V36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="drop-primary">
              {isDragging ? "Release to encrypt" : "Drop file here"}
            </p>
            <p className="drop-secondary">or <span className="drop-link">browse</span> · Max 500MB</p>
          </div>
        )}
      </div>

      {error && <div className="uploader-error">{error}</div>}
    </div>
  );
}

function getFileIcon(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const icons = {
    pdf: "📄", doc: "📝", docx: "📝", txt: "📋",
    jpg: "🖼", jpeg: "🖼", png: "🖼", gif: "🖼", webp: "🖼", svg: "🖼",
    mp4: "🎬", mov: "🎬", avi: "🎬", mkv: "🎬",
    mp3: "🎵", wav: "🎵", flac: "🎵",
    zip: "🗜", rar: "🗜", "7z": "🗜", tar: "🗜", gz: "🗜",
    js: "💻", ts: "💻", jsx: "💻", tsx: "💻", py: "💻", html: "💻", css: "💻",
    xls: "📊", xlsx: "📊", csv: "📊",
    ppt: "📊", pptx: "📊",
  };
  return icons[ext] || "📁";
}
