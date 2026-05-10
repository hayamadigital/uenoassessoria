import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useRequireAuth } from '@/hooks/useAuth'
import { FullPageSpinner } from '@/components/ui/spinner'

export function AppShell() {
  const { isLoading, session } = useRequireAuth(['admin'])

  if (isLoading) return <FullPageSpinner />
  if (!session) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
