// ExpirySelector.jsx — Expiration time picker
import { useState } from "react";

const EXPIRY_OPTIONS = [
  { label: "1 Hour", value: "1h", seconds: 3600 },
  { label: "24 Hours", value: "24h", seconds: 86400 },
  { label: "7 Days", value: "7d", seconds: 604800 },
  { label: "30 Days", value: "30d", seconds: 2592000 },
];

export default function ExpirySelector({ value, onChange }) {
  return (
    <div className="expiry-selector">
      <label className="expiry-label">
        <span className="label-icon">⏱</span>
        Auto-delete after
      </label>
      <div className="expiry-options">
        {EXPIRY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`expiry-btn ${value === opt.value ? "active" : ""}`}
            onClick={() => onChange(opt)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
