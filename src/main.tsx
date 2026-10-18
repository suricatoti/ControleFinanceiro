import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import { checkAndCleanVersionCache, checkRemoteVersionAndAutoUpdate } from './lib/versionManager'

// 1. Checagem local imediata
checkAndCleanVersionCache().catch(console.error)

// 2. Checagem remota no servidor ao iniciar (se online, atualiza e recarrega silenciosamente se houver novidades)
checkRemoteVersionAndAutoUpdate().catch(console.error)

// 3. Registra o Service Worker e configura listeners de verificação ativa
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
  },
  onRegisteredSW(_swUrl, r) {
    if (r) {
      const checkUpdates = () => {
        if (navigator.onLine) {
          r.update().catch(console.error)
          checkRemoteVersionAndAutoUpdate().catch(console.error)
        }
      }

      // Ao retornar ao app no celular ou focar na aba
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkUpdates()
        }
      })
      window.addEventListener('focus', checkUpdates)

      // Checagem periódica a cada 3 minutos
      setInterval(checkUpdates, 3 * 60 * 1000)
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
