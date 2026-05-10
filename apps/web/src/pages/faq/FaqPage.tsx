import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HelpCircle, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical,
  Car, FileText, Calendar, Clock, MapPin, CreditCard, Users, Shield,
  BookOpen, CheckCircle, AlertCircle, Info, Phone, Mail, Globe, Star,
  Briefcase, Building, Flag, Award, ClipboardList, MessageCircle, Lock,
  Camera, Download, Landmark, Lightbulb, Navigation, Clipboard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { listFaqs, createFaq, updateFaq, deleteFaq } from '@ueno/firebase/queries/faq'
import type { FAQ } from '@ueno/firebase'

// ── Ícones disponíveis ────────────────────────────────────────
const ICON_LIST: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: 'HelpCircle',    label: 'Dúvida',         Icon: HelpCircle },
  { name: 'Car',           label: 'Carro',           Icon: Car },
  { name: 'FileText',      label: 'Documento',       Icon: FileText },
  { name: 'Calendar',      label: 'Calendário',      Icon: Calendar },
  { name: 'Clock',         label: 'Prazo',           Icon: Clock },
  { name: 'MapPin',        label: 'Local',           Icon: MapPin },
  { name: 'Navigation',    label: 'Navegação',       Icon: Navigation },
  { name: 'CreditCard',    label: 'Pagamento',       Icon: CreditCard },
  { name: 'Users',         label: 'Pessoas',         Icon: Users },
  { name: 'Shield',        label: 'Segurança',       Icon: Shield },
  { name: 'BookOpen',      label: 'Estudo',          Icon: BookOpen },
  { name: 'CheckCircle',   label: 'Concluído',       Icon: CheckCircle },
  { name: 'AlertCircle',   label: 'Atenção',         Icon: AlertCircle },
  { name: 'Info',          label: 'Informação',      Icon: Info },
  { name: 'Phone',         label: 'Telefone',        Icon: Phone },
  { name: 'Mail',          label: 'E-mail',          Icon: Mail },
  { name: 'Globe',         label: 'Internacional',   Icon: Globe },
  { name: 'Star',          label: 'Destaque',        Icon: Star },
  { name: 'Briefcase',     label: 'Serviço',         Icon: Briefcase },
  { name: 'Building',      label: 'Departamento',    Icon: Building },
  { name: 'Landmark',      label: 'Órgão público',   Icon: Landmark },
  { name: 'Flag',          label: 'Processo',        Icon: Flag },
  { name: 'Award',         label: 'Aprovação',       Icon: Award },
  { name: 'ClipboardList', label: 'Lista',           Icon: ClipboardList },
  { name: 'Clipboard',     label: 'Formulário',      Icon: Clipboard },
  { name: 'MessageCircle', label: 'Mensagem',        Icon: MessageCircle },
  { name: 'Lock',          label: 'Acesso',          Icon: Lock },
  { name: 'Camera',        label: 'Foto',            Icon: Camera },
  { name: 'Download',      label: 'Download',        Icon: Download },
  { name: 'Lightbulb',     label: 'Dica',            Icon: Lightbulb },
]

const DEFAULT_ICON = 'HelpCircle'
const DEFAULT_COLOR = '#6B46C1'

function getIconComponent(name: string): LucideIcon {
  return ICON_LIST.find((i) => i.name === name)?.Icon ?? HelpCircle
}

// ── Paleta de cores ───────────────────────────────────────────
const COLOR_PALETTE: string[] = [
  '#6B46C1', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#F97316', '#06B6D4',
  '#8B5CF6', '#14B8A6', '#84CC16', '#6366F1',
]

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ── Seletor de cor ────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          className="h-7 w-7 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: cor,
            outline: value === cor ? `3px solid ${cor}` : '2px solid transparent',
            outlineOffset: '2px',
          }}
          title={cor}
        />
      ))}
    </div>
  )
}

// ── Seletor de ícone ──────────────────────────────────────────
function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (n: string) => void }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? ICON_LIST.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : ICON_LIST

  const selected = ICON_LIST.find((i) => i.name === value)

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      {/* Busca */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
          fill="none" stroke="currentColor" strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ícone..."
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Grid com scroll */}
      <div className="max-h-48 overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum ícone encontrado.</p>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filtered.map(({ name, label, Icon }) => {
              const isSelected = value === name
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(name)}
                  title={label}
                  className="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-background"
                  style={
                    isSelected
                      ? {
                          backgroundColor: hexToRgba(color, 0.15),
                          boxShadow: `0 0 0 2px ${color}`,
                        }
                      : {}
                  }
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0"
                    style={{ color: isSelected ? color : 'currentColor' }}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Ícone selecionado */}
      {selected && (
        <div className="flex items-center gap-2 border-t pt-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: hexToRgba(color, 0.15) }}
          >
            <selected.Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-xs text-muted-foreground">
            Selecionado: <span className="font-medium text-foreground">{selected.label}</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ── Ícone visual (preview do mobile) ─────────────────────────
function FaqIconPreview({ cor, icone }: { cor: string; icone: string }) {
  const Icon = getIconComponent(icone)
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: hexToRgba(cor, 0.15) }}
    >
      <Icon className="h-5 w-5" style={{ color: cor }} />
    </div>
  )
}

// ── Dialog de criar/editar ────────────────────────────────────
function FaqDialog({
  faq,
  nextOrdem,
  onClose,
}: {
  faq?: FAQ
  nextOrdem: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!faq

  const [pergunta, setPergunta] = useState(faq?.pergunta ?? '')
  const [resposta, setResposta] = useState(faq?.resposta ?? '')
  const [corIcone, setCorIcone] = useState(faq?.cor_icone ?? DEFAULT_COLOR)
  const [icone, setIcone] = useState(faq?.icone ?? DEFAULT_ICON)
  const [isActive, setIsActive] = useState(faq?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      if (!pergunta.trim()) throw new Error('Pergunta é obrigatória')
      if (!resposta.trim()) throw new Error('Resposta é obrigatória')
      const payload = {
        pergunta: pergunta.trim(),
        resposta: resposta.trim(),
        cor_icone: corIcone,
        icone,
        is_active: isActive,
        ordem: faq?.ordem ?? nextOrdem,
      }
      return isEdit ? updateFaq(db, faq!.id, payload) : createFaq(db, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] })
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  })

  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Editar Pergunta' : 'Nova Pergunta'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Preview */}
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
          <FaqIconPreview cor={corIcone} icone={icone} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-foreground">
              {pergunta || 'Prévia da pergunta'}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {resposta || 'Prévia da resposta...'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Pergunta <span className="text-destructive">*</span></Label>
          <Input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex: Como agendar uma aula prática?"
          />
        </div>

        <div className="space-y-2">
          <Label>Resposta <span className="text-destructive">*</span></Label>
          <textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Digite a resposta completa..."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <Label>Ícone</Label>
          <IconPicker value={icone} color={corIcone} onChange={setIcone} />
        </div>

        <div className="space-y-2">
          <Label>Cor do ícone</Label>
          <ColorPicker value={corIcone} onChange={setCorIcone} />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="faq-is-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="faq-is-active" className="text-sm">Publicada</label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
          {isEdit ? 'Salvar' : 'Criar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ── Row da lista ──────────────────────────────────────────────
function FaqRow({
  faq,
  onEdit,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  faq: FAQ
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  isToggling: boolean
  isDeleting: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <tr className={`hover:bg-muted/20 ${!faq.is_active ? 'opacity-50' : ''}`}>
      <td className="px-3 py-3">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </td>
      <td className="px-3 py-3">
        <FaqIconPreview cor={faq.cor_icone} icone={faq.icone ?? DEFAULT_ICON} />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium leading-snug">{faq.pergunta}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{faq.resposta}</p>
      </td>
      <td className="px-4 py-3">
        <Badge variant={faq.is_active ? 'success' : 'outline'}>
          {faq.is_active ? 'Publicada' : 'Inativa'}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            isLoading={isToggling}
            title={faq.is_active ? 'Desativar' : 'Ativar'}
          >
            {faq.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {!faq.is_active && !confirmDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              title="Deletar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-1">
              <Button variant="destructive" size="sm" onClick={onDelete} isLoading={isDeleting}>
                Confirmar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Página principal ──────────────────────────────────────────
export function FaqPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editFaq, setEditFaq] = useState<FAQ | null>(null)

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faq'],
    queryFn: () => listFaqs(db),
  })

  const publicadas = faqs.filter((f) => f.is_active).length
  const rascunhos = faqs.filter((f) => !f.is_active).length

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateFaq(db, id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFaq(db, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq'] }),
  })

  return (
    <div>
      <PageHeader
        title="Perguntas Frequentes"
        subtitle={`${publicadas} publicada(s) · ${rascunhos} inativa(s)`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova
          </Button>
        }
      />

      <div className="p-8">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : faqs.length === 0 ? (
          <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
            Nenhuma pergunta cadastrada.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="w-14 px-3 py-3" />
                  <th className="px-4 py-3 text-left font-medium">Pergunta</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {faqs.map((faq) => (
                  <FaqRow
                    key={faq.id}
                    faq={faq}
                    onEdit={() => setEditFaq(faq)}
                    onToggle={() =>
                      toggleMutation.mutate({ id: faq.id, is_active: !faq.is_active })
                    }
                    onDelete={() => deleteMutation.mutate(faq.id)}
                    isToggling={toggleMutation.isPending && toggleMutation.variables?.id === faq.id}
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === faq.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        {createOpen && (
          <FaqDialog nextOrdem={faqs.length} onClose={() => setCreateOpen(false)} />
        )}
      </Dialog>

      <Dialog open={!!editFaq} onOpenChange={(open: boolean) => { if (!open) setEditFaq(null) }}>
        {editFaq && (
          <FaqDialog faq={editFaq} nextOrdem={faqs.length} onClose={() => setEditFaq(null)} />
        )}
      </Dialog>
    </div>
  )
}
