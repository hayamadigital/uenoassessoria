import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Plus, LayoutList, LayoutGrid, ImageIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { db } from '@/lib/firebase'
import { listServicos, createServico } from '@ueno/firebase/queries/servicos'
import { servicoSchema, type ServicoInput } from '@ueno/utils/validators'
import type { Servico } from '@ueno/firebase'

type ViewMode = 'table' | 'cards'

// ── Novo Serviço Form ─────────────────────────────────────────
function NovoServicoForm({
  onSubmit,
  isLoading,
  onCancel,
  nextOrdem,
}: {
  onSubmit: (data: ServicoInput) => void
  isLoading: boolean
  onCancel: () => void
  nextOrdem: number
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServicoInput>({
    resolver: zodResolver(servicoSchema),
    defaultValues: { is_active: true, preco_jpy: 0, ordem: nextOrdem },
  })

  return (
    <form id="novo-servico-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Nome <span className="text-destructive">*</span></Label>
        <Input {...register('nome')} placeholder="Ex: CNH Categoria B" />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <textarea
          {...register('descricao')}
          placeholder="Descrição do serviço..."
          className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Duração</Label>
          <Input
            {...register('duracao_texto')}
            placeholder="Ex: 3 meses, 2 semanas"
          />
        </div>
        <div className="space-y-2">
          <Label>Preço (¥)</Label>
          <Input
            type="number"
            min={0}
            {...register('preco_jpy', { valueAsNumber: true })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('is_active')} id="novo-is-active" defaultChecked />
        <label htmlFor="novo-is-active" className="text-sm">Ativo</label>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" form="novo-servico-form" isLoading={isLoading}>
          Criar Serviço
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Card de serviço ───────────────────────────────────────────
function ServicoCard({ servico }: { servico: Servico }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden flex flex-col">
      <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden">
        {servico.imagem_url ? (
          <img
            src={servico.imagem_url}
            alt={servico.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={servico.is_active ? 'success' : 'outline'}>
            {servico.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-sm leading-tight">{servico.nome}</h3>
        {servico.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{servico.descricao}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {servico.duracao_texto && (
            <span>Duração: {servico.duracao_texto}</span>
          )}
          {servico.preco_jpy > 0 && (
            <span>¥{servico.preco_jpy.toLocaleString('ja-JP')}</span>
          )}
        </div>
      </div>
      <div className="px-4 pb-4">
        <Link to={`/servicos/${servico.id}`} className="w-full">
          <Button variant="outline" size="sm" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Configurar
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export function ServicosPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('table')

  const { data: servicos, isLoading } = useQuery({
    queryKey: ['servicos', 'all'],
    queryFn: () => listServicos(db, false),
  })

  const createMutation = useMutation({
    mutationFn: (data: ServicoInput) =>
      createServico(db, {
        nome: data.nome,
        descricao: data.descricao || null,
        duracao_texto: data.duracao_texto || null,
        preco_jpy: data.preco_jpy,
        imagem_url: null,
        is_active: data.is_active,
        ordem: data.ordem,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos', 'all'] })
      setCreateOpen(false)
    },
  })

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle={`${servicos?.length ?? 0} serviço(s) cadastrado(s)`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none border-r"
                onClick={() => setView('table')}
                title="Visualização em tabela"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'cards' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setView('cards')}
                title="Visualização em cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : view === 'table' ? (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Duração</th>
                  <th className="px-4 py-3 text-left font-medium">Preço (¥)</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {servicos?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum serviço cadastrado.
                    </td>
                  </tr>
                ) : null}
                {servicos?.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{s.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.duracao_texto || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.preco_jpy > 0 ? `¥${s.preco_jpy.toLocaleString('ja-JP')}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'success' : 'outline'}>
                        {s.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/servicos/${s.id}`}>
                        <Button variant="ghost" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Configurar
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {servicos?.length === 0 ? (
              <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
                Nenhum serviço cadastrado.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {servicos?.map((s) => (
                  <ServicoCard key={s.id} servico={s} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Novo Serviço Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Serviço</DialogTitle>
          </DialogHeader>
          <NovoServicoForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            nextOrdem={servicos?.length ?? 0}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
