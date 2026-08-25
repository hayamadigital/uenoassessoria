import { useState } from 'react'
import { useFieldArray, useForm, type UseFormReturn, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  CheckSquare,
  CreditCard,
  CalendarDays,
  AlignLeft,
  PenLine,
  Package,
  ListChecks,
} from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Badge } from './badge'
import { contratoSecaoCampoSchema, tipoSecaoContratoValues, tipoCampoContratoValues } from '@ueno/utils/validators'
import type { ContratoSecaoInput, ContratoSecaoCampoInput } from '@ueno/utils/validators'
import type { TipoSecaoContrato, TipoCampoContrato } from '@ueno/firebase'
import { z } from 'zod'

// ─── Labels ──────────────────────────────────────────────────────────────────

const TIPO_SECAO_LABEL: Record<TipoSecaoContrato, string> = {
  cabecalho:         'Cabeçalho',
  lista_servicos:    'Lista de Serviços',
  pagamento:         'Pagamento',
  cronograma:        'Cronograma de Pagamentos',
  clausula_texto:    'Cláusula (Texto)',
  assinatura:        'Assinatura',
  descricao_servico: 'Descrição do Serviço',
  lista_etapas:      'Etapas do Processo',
}

const TIPO_CAMPO_LABEL: Record<TipoCampoContrato, string> = {
  texto:          'Texto',
  valor_jpy:      'Valor em ¥',
  numero_inteiro: 'Número inteiro',
  data:           'Data',
  booleano:       'Sim/Não (checkbox)',
}

const TIPO_SECAO_ICON: Record<TipoSecaoContrato, React.ReactNode> = {
  cabecalho:         <FileText className="h-4 w-4" />,
  lista_servicos:    <CheckSquare className="h-4 w-4" />,
  pagamento:         <CreditCard className="h-4 w-4" />,
  cronograma:        <CalendarDays className="h-4 w-4" />,
  clausula_texto:    <AlignLeft className="h-4 w-4" />,
  assinatura:        <PenLine className="h-4 w-4" />,
  descricao_servico: <Package className="h-4 w-4" />,
  lista_etapas:      <ListChecks className="h-4 w-4" />,
}

// ─── Campo editor ─────────────────────────────────────────────────────────────

function CampoRow({
  campo,
  onUpdate,
  onRemove,
}: {
  campo: ContratoSecaoCampoInput
  onUpdate: (c: ContratoSecaoCampoInput) => void
  onRemove: () => void
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <div>
        <Label className="text-xs mb-1 block">Label</Label>
        <Input
          value={campo.label}
          onChange={(e) => onUpdate({ ...campo, label: e.target.value })}
          placeholder="Ex: Nome do contratante"
          className="h-8 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">Variável</Label>
        <Input
          value={campo.variavel}
          onChange={(e) => onUpdate({ ...campo, variavel: e.target.value.toLowerCase().replace(/[^a-z_]/g, '_') })}
          placeholder="Ex: cliente_nome"
          className="h-8 text-xs font-mono"
        />
      </div>
      <div>
        <Label className="text-xs mb-1 block">Tipo</Label>
        <select
          value={campo.tipo}
          onChange={(e) => onUpdate({ ...campo, tipo: e.target.value as TipoCampoContrato })}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          {tipoCampoContratoValues.map((t) => (
            <option key={t} value={t}>{TIPO_CAMPO_LABEL[t]}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col items-center gap-1 pb-0.5">
        <Label className="text-xs">Obrig.</Label>
        <input
          type="checkbox"
          checked={campo.obrigatorio}
          onChange={(e) => onUpdate({ ...campo, obrigatorio: e.target.checked })}
          className="h-4 w-4 mt-1"
        />
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive h-8 w-8">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ─── Secao card ──────────────────────────────────────────────────────────────

function SecaoCard({
  secao,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  secao: ContratoSecaoInput
  index: number
  total: number
  onUpdate: (s: ContratoSecaoInput) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  function addCampo() {
    const newCampo: ContratoSecaoCampoInput = {
      id: `f_${Date.now()}`,
      label: '',
      tipo: 'texto',
      variavel: '',
      obrigatorio: false,
      valor_padrao: null,
    }
    onUpdate({ ...secao, campos: [...secao.campos, newCampo] })
  }

  function updateCampo(i: number, c: ContratoSecaoCampoInput) {
    const campos = [...secao.campos]
    campos[i] = c
    onUpdate({ ...secao, campos })
  }

  function removeCampo(i: number) {
    onUpdate({ ...secao, campos: secao.campos.filter((_, idx) => idx !== i) })
  }

  const showConteudo = secao.tipo === 'clausula_texto' || secao.tipo === 'lista_servicos'
  const showCampos   = secao.tipo !== 'clausula_texto' && secao.tipo !== 'descricao_servico' && secao.tipo !== 'lista_etapas'
  const isAutoPopulated = secao.tipo === 'descricao_servico' || secao.tipo === 'lista_etapas'

  return (
    <div className="rounded-lg border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground shrink-0">{TIPO_SECAO_ICON[secao.tipo as TipoSecaoContrato]}</span>
        <Badge variant="outline" className="text-xs shrink-0">{TIPO_SECAO_LABEL[secao.tipo as TipoSecaoContrato]}</Badge>
        <span className="flex-1 text-sm font-medium truncate">{secao.titulo || '(sem título)'}</span>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={(e) => { e.stopPropagation(); onMoveUp() }}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === total - 1} onClick={(e) => { e.stopPropagation(); onMoveDown() }}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onRemove() }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Título */}
          <div className="space-y-1.5">
            <Label className="text-xs">Título da seção</Label>
            <Input
              value={secao.titulo}
              onChange={(e) => onUpdate({ ...secao, titulo: e.target.value })}
              placeholder="Ex: Cláusula 1 – Assistência"
            />
          </div>

          {/* Auto-populated notice */}
          {isAutoPopulated && (
            <div className="rounded-md bg-muted/40 border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Seção preenchida automaticamente com dados do serviço/processo selecionado ao criar o contrato.
            </div>
          )}

          {/* Conteúdo HTML (texto fixo) */}
          {showConteudo && (
            <div className="space-y-1.5">
              <Label className="text-xs">Conteúdo (texto fixo)</Label>
              <textarea
                value={secao.conteudo_html ?? ''}
                onChange={(e) => onUpdate({ ...secao, conteudo_html: e.target.value || null })}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Texto estático desta seção..."
              />
            </div>
          )}

          {/* Campos dinâmicos */}
          {showCampos && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Campos dinâmicos</Label>
                <Button variant="outline" size="sm" onClick={addCampo} className="h-7 text-xs">
                  <Plus className="mr-1.5 h-3 w-3" />
                  Adicionar campo
                </Button>
              </div>
              {secao.campos.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum campo dinâmico.</p>
              ) : (
                <div className="space-y-2">
                  {secao.campos.map((c, i) => (
                    <CampoRow
                      key={c.id}
                      campo={c}
                      onUpdate={(nc) => updateCampo(i, nc)}
                      onRemove={() => removeCampo(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export function SecaoContratoBuilder({
  value,
  onChange,
}: {
  value: ContratoSecaoInput[]
  onChange: (secoes: ContratoSecaoInput[]) => void
}) {
  function addSecao(tipo: TipoSecaoContrato) {
    const newSecao: ContratoSecaoInput = {
      id: `s_${Date.now()}`,
      ordem: value.length + 1,
      tipo,
      titulo: TIPO_SECAO_LABEL[tipo],
      conteudo_html: null,
      campos: [],
      variacao_ids: [],
    }
    onChange([...value, newSecao])
  }

  function updateSecao(i: number, s: ContratoSecaoInput) {
    const next = [...value]
    next[i] = s
    onChange(next)
  }

  function removeSecao(i: number) {
    onChange(value.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, ordem: idx + 1 })))
  }

  function moveSecao(from: number, to: number) {
    const next = [...value]
    const item = next.splice(from, 1)[0]
    if (!item) return
    next.splice(to, 0, item)
    onChange(next.map((s, idx) => ({ ...s, ordem: idx + 1 })))
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          Nenhuma seção. Adicione abaixo.
        </div>
      ) : (
        value.map((secao, i) => (
          <SecaoCard
            key={secao.id}
            secao={secao}
            index={i}
            total={value.length}
            onUpdate={(s) => updateSecao(i, s)}
            onRemove={() => removeSecao(i)}
            onMoveUp={() => moveSecao(i, i - 1)}
            onMoveDown={() => moveSecao(i, i + 1)}
          />
        ))
      )}

      {/* Add section menu */}
      <div className="flex flex-wrap gap-2 pt-1">
        {tipoSecaoContratoValues.map((tipo) => (
          <Button
            key={tipo}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSecao(tipo as TipoSecaoContrato)}
            className="h-8 text-xs"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            {TIPO_SECAO_LABEL[tipo as TipoSecaoContrato]}
          </Button>
        ))}
      </div>
    </div>
  )
}
