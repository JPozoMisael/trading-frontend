import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-sans-condensed/400.css'
import '@fontsource/ibm-plex-sans-condensed/500.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiError } from './api/client'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import './styles/tokens.css'
import './styles/app.css'

// Tema antes del primer pintado (evita el destello)
try {
  const t = localStorage.getItem('mesa:tema')
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t
  else if (window.matchMedia?.('(prefers-color-scheme: light)').matches) document.documentElement.dataset.theme = 'light'
} catch {
  /* sin almacenamiento */
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Un 401 no se reintenta: vuelve al login
      retry: (n, err) => !(err instanceof ApiError && (err.status === 401 || err.status === 400)) && n < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
