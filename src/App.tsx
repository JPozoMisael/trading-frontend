import { createBrowserRouter, RouterProvider } from 'react-router'
import { useAuth } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { AppShell } from './components/AppShell'
import { LiveProvider } from './live/LiveProvider'
import { ChartPage } from './pages/ChartPage'
import { ModelPage } from './pages/ModelPage'
import { PerformancePage } from './pages/PerformancePage'
import { TradesPage } from './pages/TradesPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <ChartPage /> },
      { path: 'modelo', element: <ModelPage /> },
      { path: 'operaciones', element: <TradesPage /> },
      { path: 'rendimiento', element: <PerformancePage /> },
      { path: '*', element: <p className="page-msg">Esta página no existe.</p> },
    ],
  },
])

export function App() {
  const { status } = useAuth()
  if (status === 'cargando') return <p className="page-msg">Comprobando sesión…</p>
  if (status === 'fuera') return <LoginPage />
  return (
    <LiveProvider>
      <RouterProvider router={router} />
    </LiveProvider>
  )
}
