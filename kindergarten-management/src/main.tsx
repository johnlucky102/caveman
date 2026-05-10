import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// ─── Service Worker Registration ──────────────────────────────────────────────
// Only register in production (not during local dev with HMR)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[SW] Registered, scope:', registration.scope);

        // Check for updates every 30 minutes
        setInterval(() => registration.update(), 30 * 60 * 1000);
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
  });
}

