import { useState } from 'react'
import { useParams, Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, MessageCircle, Send, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/lib/firebase'
import { getCliente } from '@ueno/firebase/queries/clientes'
import { cn } from '@/lib/cn'
import type { StatusProcesso } from '@ueno/firebase'

const statusLabel: Record<StatusProcesso, string> = {
  prospect: 'Prospecto',
  contato: 'Em Contato',
  documentacao: 'Documentação',
  agendado: 'Agendado',
  em_andamento: 'Em Andamento',
  aprovado: 'Aprovado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const tabs = [
  { label: 'Processo', href: 'processo' },
  { label: 'Dados Pessoais', href: 'dados-pessoais' },
  { label: 'Contatos', href: 'contatos' },
  { label: 'Habilitações', href: 'habilitacoes' },
  { label: 'Japão / Visto', href: 'japao-visto' },
  { label: 'Endereço', href: 'endereco' },
  { label: 'Documentos', href: 'documentos' },
  { label: 'Histórico', href: 'historico' },
  // Stubs legados (mantidos temporariamente)
  { label: 'Agendamentos', href: 'agendamentos' },
  { label: 'Financeiro', href: 'financeiro' },
  { label: 'Contratos', href: 'contratos' },
  { label: 'Avaliações', href: 'avaliacoes' },
]

function ReenviarCredenciaisButton({
  profileId,
  whatsapp,
}: {
  profileId: string
  whatsapp: string | null
}) {
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  async function enviar() {
    setSending(true)
    setFeedback(null)
    try {
      const inviteUser = httpsCallable<
        { profile_id: string },
        { whatsapp_url?: string }
      >(getFunctions(), 'inviteUser')

      const { data } = await inviteUser({ profile_id: profileId })

      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, '_blank', 'noopener,noreferrer')
      }

      setFeedback({ tipo: 'ok', msg: 'WhatsApp aberto!' })
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        msg: err instanceof Error ? err.message : 'Erro ao enviar credenciais',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={enviar}
        disabled={sending || !whatsapp}
        title={!whatsapp ? 'WhatsApp não cadastrado' : 'Enviar credenciais via WhatsApp'}
        className="gap-2"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        Enviar Credenciais
      </Button>

      {feedback && (
        <p
          className={cn(
            'absolute right-0 top-full mt-1 text-xs whitespace-nowrap',
            feedback.tipo === 'ok' ? 'text-green-600' : 'text-destructive',
          )}
        >
          {feedback.msg}
        </p>
      )}
    </div>
  )
}

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['clientes', id],
    queryFn: () => getCliente(db, id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!cliente) return null

  return (
    <div>
      <div className="flex items-start justify-between border-b px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center shrink-0">
            {cliente.profile.avatar_url ? (
              <img
                src={cliente.profile.avatar_url}
                alt={cliente.profile.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{cliente.profile.full_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{cliente.profile.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ReenviarCredenciaisButton
            profileId={cliente.profile_id}
            whatsapp={cliente.profile.whatsapp ?? null}
          />
          <Badge variant="secondary">{statusLabel[cliente.status_processo]}</Badge>
        </div>
      </div>

      {/* Back link */}
      <div className="px-8 pt-4">
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar para Clientes
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b px-8 mt-4">
        <div className="flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
          {tabs.map((tab) => {
            const href = `/clientes/${id}/${tab.href}`
            const isActive = location.pathname === href
            return (
              <Link
                key={tab.href}
                to={href}
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

      {/* Tab content */}
      <div className="p-8">
        <Outlet context={{ cliente }} />
      </div>
    </div>
  )
}
