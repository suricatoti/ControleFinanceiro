import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { checkAndCleanVersionCache } from './lib/versionManager'

// Checa versão salva vs versão atual e limpa caches estáticos caso haja nova versão
checkAndCleanVersionCache().catch(console.error)

// Registra Service Worker e checa atualizações ativamente
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Se nova versão do SW foi encontrada, atualiza imediatamente
    updateSW(true)
  },
  onRegisteredSW(_swUrl, r) {
    if (r) {
      // Checa atualizações sempre que o usuário voltar à aba
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          r.update().catch(console.error)
        }
      })
      window.addEventListener('focus', () => {
        if (navigator.onLine) {
          r.update().catch(console.error)
        }
      })
      // Checa a cada 5 minutos
      setInterval(() => {
        if (navigator.onLine) {
          r.update().catch(console.error)
        }
      }, 5 * 60 * 1000)
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

