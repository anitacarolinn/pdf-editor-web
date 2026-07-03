import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './text-layer.css'
import App from './App.tsx'
import { I18nProvider } from './services/i18n.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
