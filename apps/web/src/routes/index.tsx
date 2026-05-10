import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ClientesPage } from '@/pages/clientes/ClientesPage'
import { ClienteDetailPage } from '@/pages/clientes/ClienteDetailPage'
import { ClientePerfilTab } from '@/pages/clientes/tabs/ClientePerfilTab'
import { lazy } from 'react'

// ── Pages lazy ──────────────────────────────────────────────
const AgendamentosPage = lazy(() =>
  import('@/pages/agendamentos/AgendamentosPage').then((m) => ({ default: m.AgendamentosPage })),
)
const NovoAgendamentoPage = lazy(() =>
  import('@/pages/agendamentos/NovoAgendamentoPage').then((m) => ({
    default: m.NovoAgendamentoPage,
  })),
)
const AgendamentoDetailPage = lazy(() =>
  import('@/pages/agendamentos/AgendamentoDetailPage').then((m) => ({
    default: m.AgendamentoDetailPage,
  })),
)
const DocumentosPage = lazy(() =>
  import('@/pages/documentos/DocumentosPage').then((m) => ({ default: m.DocumentosPage })),
)
const FinanceiroPage = lazy(() =>
  import('@/pages/financeiro/FinanceiroPage').then((m) => ({ default: m.FinanceiroPage })),
)
const MateriaisPage = lazy(() =>
  import('@/pages/materiais/MateriaisPage').then((m) => ({ default: m.MateriaisPage })),
)
const QuestoesPage = lazy(() =>
  import('@/pages/materiais/QuestoesPage').then((m) => ({ default: m.QuestoesPage })),
)
const MaterialDetailPage = lazy(() =>
  import('@/pages/materiais/MaterialDetailPage').then((m) => ({
    default: m.MaterialDetailPage,
  })),
)
const ServicosPage = lazy(() =>
  import('@/pages/servicos/ServicosPage').then((m) => ({ default: m.ServicosPage })),
)
const ServicosDetailPage = lazy(() =>
  import('@/pages/servicos/ServicosDetailPage').then((m) => ({
    default: m.ServicosDetailPage,
  })),
)
const ContratosPage = lazy(() =>
  import('@/pages/contratos/ContratosPage').then((m) => ({ default: m.ContratosPage })),
)
const AvaliacoesPage = lazy(() =>
  import('@/pages/avaliacoes/AvaliacoesPage').then((m) => ({ default: m.AvaliacoesPage })),
)
const RotasPage = lazy(() =>
  import('@/pages/rotas/RotasPage').then((m) => ({ default: m.RotasPage })),
)
const RotasPlanejamentoPage = lazy(() =>
  import('@/pages/rotas/RotasPlanejamentoPage').then((m) => ({
    default: m.RotasPlanejamentoPage,
  })),
)
const NotificacoesPage = lazy(() =>
  import('@/pages/notificacoes/NotificacoesPage').then((m) => ({ default: m.NotificacoesPage })),
)
const ConfiguracoesPage = lazy(() =>
  import('@/pages/configuracoes/ConfiguracoesPage').then((m) => ({
    default: m.ConfiguracoesPage,
  })),
)
const MeuPerfilTab = lazy(() =>
  import('@/pages/configuracoes/tabs/MeuPerfilTab').then((m) => ({ default: m.MeuPerfilTab })),
)
const SegurancaTab = lazy(() =>
  import('@/pages/configuracoes/tabs/SegurancaTab').then((m) => ({ default: m.SegurancaTab })),
)
const UsuariosTab = lazy(() =>
  import('@/pages/configuracoes/tabs/UsuariosTab').then((m) => ({ default: m.UsuariosTab })),
)
const PreferenciasTab = lazy(() =>
  import('@/pages/configuracoes/tabs/PreferenciasTab').then((m) => ({
    default: m.PreferenciasTab,
  })),
)
const LocaisTab = lazy(() =>
  import('@/pages/configuracoes/tabs/LocaisTab').then((m) => ({ default: m.LocaisTab })),
)
const ContratoTemplatesTab = lazy(() =>
  import('@/pages/configuracoes/tabs/ContratoTemplatesTab').then((m) => ({
    default: m.ContratoTemplatesTab,
  })),
)
const FaqPage = lazy(() =>
  import('@/pages/faq/FaqPage').then((m) => ({ default: m.FaqPage })),
)

// ── Cliente pages lazy ───────────────────────────────────────
const NovoClientePage = lazy(() =>
  import('@/pages/clientes/NovoClientePage').then((m) => ({ default: m.NovoClientePage })),
)
const ProcessoDetailPage = lazy(() =>
  import('@/pages/clientes/ProcessoDetailPage').then((m) => ({
    default: m.ProcessoDetailPage,
  })),
)

// ── Cliente tabs lazy ────────────────────────────────────────
const ClienteProcessoTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteProcessoTab').then((m) => ({
    default: m.ClienteProcessoTab,
  })),
)
const ClienteDadosPessoaisTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteDadosPessoaisTab').then((m) => ({
    default: m.ClienteDadosPessoaisTab,
  })),
)
const ClienteContatosTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteContatosTab').then((m) => ({
    default: m.ClienteContatosTab,
  })),
)
const ClienteHabilitacoesTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteHabilitacoesTab').then((m) => ({
    default: m.ClienteHabilitacoesTab,
  })),
)
const ClienteJapaoVistoTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteJapaoVistoTab').then((m) => ({
    default: m.ClienteJapaoVistoTab,
  })),
)
const ClienteEnderecoTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteEnderecoTab').then((m) => ({
    default: m.ClienteEnderecoTab,
  })),
)
const ClienteDocumentosTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteDocumentosTab').then((m) => ({
    default: m.ClienteDocumentosTab,
  })),
)
const ClienteHistoricoTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteHistoricoTab').then((m) => ({
    default: m.ClienteHistoricoTab,
  })),
)
// Legacy stubs
const ClienteAgendamentosTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteAgendamentosTab').then((m) => ({
    default: m.ClienteAgendamentosTab,
  })),
)
const ClienteFinanceiroTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteFinanceiroTab').then((m) => ({
    default: m.ClienteFinanceiroTab,
  })),
)
const ClienteContratosTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteContratosTab').then((m) => ({
    default: m.ClienteContratosTab,
  })),
)
const ClienteAvaliacoesTab = lazy(() =>
  import('@/pages/clientes/tabs/ClienteAvaliacoesTab').then((m) => ({
    default: m.ClienteAvaliacoesTab,
  })),
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },

      // ── Clientes ──────────────────────────────────────────
      // IMPORTANT: /clientes/novo must come before /clientes/:id
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'clientes/novo', element: <NovoClientePage /> },
      {
        path: 'clientes/:id',
        element: <ClienteDetailPage />,
        children: [
          { index: true, element: <Navigate to="processo" replace /> },
          { path: 'processo', element: <ClienteProcessoTab /> },
          { path: 'dados-pessoais', element: <ClienteDadosPessoaisTab /> },
          { path: 'contatos', element: <ClienteContatosTab /> },
          { path: 'habilitacoes', element: <ClienteHabilitacoesTab /> },
          { path: 'japao-visto', element: <ClienteJapaoVistoTab /> },
          { path: 'endereco', element: <ClienteEnderecoTab /> },
          { path: 'documentos', element: <ClienteDocumentosTab /> },
          { path: 'historico', element: <ClienteHistoricoTab /> },
          // Legacy stubs
          { path: 'perfil', element: <ClientePerfilTab /> },
          { path: 'agendamentos', element: <ClienteAgendamentosTab /> },
          { path: 'financeiro', element: <ClienteFinanceiroTab /> },
          { path: 'contratos', element: <ClienteContratosTab /> },
          { path: 'avaliacoes', element: <ClienteAvaliacoesTab /> },
        ],
      },
      { path: 'clientes/:id/processos/:processoId', element: <ProcessoDetailPage /> },

      // ── Agendamentos ──────────────────────────────────────
      // IMPORTANT: /agendamentos/novo must come before /agendamentos/:id
      { path: 'agendamentos', element: <AgendamentosPage /> },
      { path: 'agendamentos/novo', element: <NovoAgendamentoPage /> },
      { path: 'agendamentos/:id', element: <AgendamentoDetailPage /> },
      { path: 'documentos', element: <DocumentosPage /> },
      { path: 'documentos/templates', element: <DocumentosPage /> },
      { path: 'financeiro', element: <FinanceiroPage /> },
      { path: 'financeiro/pagamentos', element: <FinanceiroPage /> },
      { path: 'materiais', element: <MateriaisPage /> },
      { path: 'materiais/questoes', element: <QuestoesPage /> },
      { path: 'materiais/:id', element: <MaterialDetailPage /> },
      { path: 'servicos', element: <ServicosPage /> },
      { path: 'servicos/:id', element: <ServicosDetailPage /> },
      { path: 'contratos', element: <ContratosPage /> },
      { path: 'contratos/:id', element: <ContratosPage /> },
      { path: 'avaliacoes', element: <AvaliacoesPage /> },
      { path: 'rotas', element: <RotasPage /> },
      { path: 'rotas/:data', element: <RotasPlanejamentoPage /> },
      { path: 'notificacoes', element: <NotificacoesPage /> },
      { path: 'faq', element: <FaqPage /> },
      {
        path: 'configuracoes',
        element: <ConfiguracoesPage />,
        children: [
          { index: true, element: <Navigate to="perfil" replace /> },
          { path: 'perfil', element: <MeuPerfilTab /> },
          { path: 'seguranca', element: <SegurancaTab /> },
          { path: 'usuarios', element: <UsuariosTab /> },
          { path: 'preferencias', element: <PreferenciasTab /> },
          { path: 'locais', element: <LocaisTab /> },
          { path: 'contratos', element: <ContratoTemplatesTab /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
