import { Link, Outlet, useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/cn'

const tabs = [
  { label: 'Meu Perfil', href: '/configuracoes/perfil' },
  { label: 'Segurança', href: '/configuracoes/seguranca' },
  { label: 'Usuários', href: '/configuracoes/usuarios' },
  { label: 'Preferências', href: '/configuracoes/preferencias' },
  { label: 'Locais', href: '/configuracoes/locais' },
  { label: 'Modelos de Contrato', href: '/configuracoes/contratos' },
]

export function ConfiguracoesPage() {
  const location = useLocation()

  return (
    <div>
      <PageHeader title="Configurações" />
      <div className="border-b px-8 mt-4">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.href
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="p-8">
        <Outlet />
      </div>
    </div>
  )
}
