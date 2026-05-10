import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  CreditCard,
  BookOpen,
  Briefcase,
  ScrollText,
  Star,
  MapPin,
  Bell,
  Settings,
  LogOut,
  HelpCircle,
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes', icon: Users, label: 'Clientes' },
  { href: '/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
  { href: '/documentos', icon: FileText, label: 'Documentos' },
  { href: '/financeiro', icon: CreditCard, label: 'Financeiro' },
  { href: '/materiais', icon: BookOpen, label: 'Materiais' },
  { href: '/servicos', icon: Briefcase, label: 'Serviços' },
  { href: '/contratos', icon: ScrollText, label: 'Contratos' },
  { href: '/avaliacoes', icon: Star, label: 'Avaliações' },
  { href: '/rotas', icon: MapPin, label: 'Rotas' },
  { href: '/notificacoes', icon: Bell, label: 'Notificações' },
  { href: '/faq', icon: HelpCircle, label: 'FAQ' },
]

export function Sidebar() {
  const location = useLocation()
  const { clear } = useAuthStore()

  const handleLogout = async () => {
    await signOut(auth)
    clear()
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <span className="text-lg font-bold text-white">UENO ASSESSORIA</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link
          to="/configuracoes"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white transition-colors"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Configurações
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/30 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
