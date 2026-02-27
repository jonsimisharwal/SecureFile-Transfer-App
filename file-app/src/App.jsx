// App.jsx — Router + global layout
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import DownloadPage from "./pages/DownloadPage";
import "./App.css";

function Header() {
  return (
    <header className="app-header">
      <a href="/" className="app-logo">
        <span className="logo-icon">⬡</span>
        <span className="logo-text">SafeSync</span>
      </a>
      <div className="header-status">
        <span className="status-indicator" />
        <span>E2E Encrypted</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <p>
        <span className="footer-lock">🔒</span> Zero-knowledge architecture — 
        files are encrypted client-side using AES-256-GCM. 
        The server only stores ciphertext.
      </p>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/download/:fileId" element={<DownloadPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
