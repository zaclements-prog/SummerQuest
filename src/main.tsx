import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Bundled offline font (replaces the Google Fonts CDN link) — works with no internet.
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
// Letters for beginning readers (K–1 letter tiles and words): see M.letters in tutoring/motion/palette.ts.
import '@fontsource/andika/latin-700.css'
import './platform/web/boot' // audio unlock (iOS), persistent storage, touch guards
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
