import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Bundled offline font (replaces the Google Fonts CDN link) — works with no internet.
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
