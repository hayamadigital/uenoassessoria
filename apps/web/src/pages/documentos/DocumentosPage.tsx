import { useLocation, Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { RevisaoDocumentosTab } from './RevisaoDocumentosTab'
import { TemplatesDocumentosTab } from './TemplatesDocumentosTab'
import { cn } from '@/lib/cn'

const tabs = [
  { label: 'Revisão de Documentos', href: '/documentos' },
  { label: 'Templates', href: '/documentos/templates' },
]

export function DocumentosPage() {
  const { pathname } = useLocation()
  const activeTab = pathname === '/documentos/templates' ? 'templates' : 'revisao'

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Revisão de documentos enviados e gestão de templates"
      />

      <div className="flex gap-1 border-b px-8">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/documentos/templates'
              ? activeTab === 'templates'
              : activeTab === 'revisao'
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
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

      <div className="p-8">
        {activeTab === 'revisao' ? <RevisaoDocumentosTab /> : <TemplatesDocumentosTab />}
      </div>
    </div>
  )
}
