import type { ContratoSecao, TipoCampoContrato } from '@ueno/firebase'
import type { ContextoContrato } from '@ueno/utils/contrato-render'
import { Input } from './input'
import { Label } from './label'
import { Badge } from './badge'

// ─── Single field ─────────────────────────────────────────────────────────────

function CampoInput({
  variavel,
  label,
  tipo,
  obrigatorio,
  valor,
  onChange,
}: {
  variavel: string
  label: string
  tipo: TipoCampoContrato
  obrigatorio: boolean
  valor: string
  onChange: (v: string) => void
}) {
  if (tipo === 'booleano') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 rounded"
          checked={valor !== 'false'}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
        />
        <span className="text-sm">{label}</span>
      </label>
    )
  }

  if (tipo === 'data') {
    return (
      <div className="space-y-1">
        <Label className="text-xs">
          {label}{obrigatorio && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Input
          type="date"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          required={obrigatorio}
          className="h-9"
        />
      </div>
    )
  }

  if (tipo === 'valor_jpy') {
    return (
      <div className="space-y-1">
        <Label className="text-xs">
          {label}{obrigatorio && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
          <Input
            type="number"
            min={0}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            required={obrigatorio}
            className="h-9 pl-7"
            placeholder="0"
          />
        </div>
      </div>
    )
  }

  if (tipo === 'numero_inteiro') {
    return (
      <div className="space-y-1">
        <Label className="text-xs">
          {label}{obrigatorio && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Input
          type="number"
          min={1}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          required={obrigatorio}
          className="h-9"
          placeholder="1"
        />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}{obrigatorio && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        required={obrigatorio}
        className="h-9"
      />
    </div>
  )
}

// ─── Cronograma section ───────────────────────────────────────────────────────

function CronogramaSection({
  secao,
  valores,
  onChange,
  contexto,
}: {
  secao: ContratoSecao
  valores: Record<string, string>
  onChange: (variavel: string, val: string) => void
  contexto?: ContextoContrato | undefined
}) {
  const parcelas = contexto?.parcelas

  if (parcelas && parcelas.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Cronograma</Badge>
          <span className="text-sm font-medium">{secao.titulo}</span>
          <Badge variant="secondary" className="text-xs">Automático</Badge>
        </div>
        <div className="rounded-md border divide-y">
          {parcelas.map((p, i) => {
            const data = p.data_vencimento
              ? new Date(p.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'Asia/Tokyo' })
              : '—'
            return (
              <div key={p.numero} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-muted-foreground">{i + 1}ª parcela</span>
                <span>{data}</span>
                <span className="font-medium">¥{p.valor_original_jpy.toLocaleString('ja-JP')}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const numParcelas = Math.min(parseInt(valores['num_parcelas'] ?? '1', 10) || 1, 5)

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">{secao.titulo}</h4>
      <div className="space-y-2">
        {Array.from({ length: numParcelas }, (_, i) => {
          const n = i + 1
          const dataCampo = secao.campos.find((c) => c.variavel === `parcela_${n}_data`)
          const valorCampo = secao.campos.find((c) => c.variavel === `parcela_${n}_valor`)
          if (!dataCampo || !valorCampo) return null
          return (
            <div key={n} className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
              <CampoInput
                variavel={dataCampo.variavel}
                label={`${n}ª parcela – Data`}
                tipo="data"
                obrigatorio={false}
                valor={valores[dataCampo.variavel] ?? ''}
                onChange={(v) => onChange(dataCampo.variavel, v)}
              />
              <CampoInput
                variavel={valorCampo.variavel}
                label={`${n}ª parcela – Valor`}
                tipo="valor_jpy"
                obrigatorio={false}
                valor={valores[valorCampo.variavel] ?? ''}
                onChange={(v) => onChange(valorCampo.variavel, v)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Descricao servico section ────────────────────────────────────────────────

function DescricaoServicoSection({
  secao,
  contexto,
}: {
  secao: ContratoSecao
  contexto?: ContextoContrato | undefined
}) {
  const s = contexto?.servico
  const v = contexto?.variacao

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">Serviço</Badge>
        <span className="text-sm font-medium">{secao.titulo}</span>
        {s && <Badge variant="secondary" className="text-xs">Automático</Badge>}
      </div>
      {s ? (
        <div className="rounded-md border divide-y text-sm">
          <div className="flex gap-3 px-4 py-2">
            <span className="w-28 shrink-0 text-muted-foreground">Serviço</span>
            <span className="font-medium">{s.nome}</span>
          </div>
          {v && (
            <div className="flex gap-3 px-4 py-2">
              <span className="w-28 shrink-0 text-muted-foreground">Modalidade</span>
              <span>{v.nome}</span>
            </div>
          )}
          {(v?.descricao ?? s.descricao) && (
            <div className="flex gap-3 px-4 py-2">
              <span className="w-28 shrink-0 text-muted-foreground">Descrição</span>
              <span className="text-muted-foreground leading-relaxed">{v?.descricao ?? s.descricao}</span>
            </div>
          )}
          {(v?.duracao_texto ?? s.duracao_texto) && (
            <div className="flex gap-3 px-4 py-2">
              <span className="w-28 shrink-0 text-muted-foreground">Duração</span>
              <span>{v?.duracao_texto ?? s.duracao_texto}</span>
            </div>
          )}
          <div className="flex gap-3 px-4 py-2">
            <span className="w-28 shrink-0 text-muted-foreground">Valor</span>
            <span className="font-semibold">
              {(() => {
                const preco = v?.preco_jpy ?? s.preco_jpy
                const variavel = v?.preco_variavel ?? s.preco_variavel
                const min = v?.preco_min_jpy ?? s.preco_min_jpy
                const max = v?.preco_max_jpy ?? s.preco_max_jpy
                if (preco) return `¥${preco.toLocaleString('ja-JP')}`
                if (variavel && min && max) return `¥${min.toLocaleString('ja-JP')} ~ ¥${max.toLocaleString('ja-JP')}`
                return 'A definir'
              })()}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic px-1">
          Selecione um processo para preencher automaticamente.
        </p>
      )}
    </div>
  )
}

// ─── Lista etapas section ─────────────────────────────────────────────────────

function ListaEtapasSection({
  secao,
  contexto,
}: {
  secao: ContratoSecao
  contexto?: ContextoContrato | undefined
}) {
  const etapas = contexto?.etapaTemplates

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">Etapas</Badge>
        <span className="text-sm font-medium">{secao.titulo}</span>
        {etapas && etapas.length > 0 && <Badge variant="secondary" className="text-xs">Automático</Badge>}
      </div>
      {etapas && etapas.length > 0 ? (
        <ol className="rounded-md border divide-y text-sm list-none">
          {etapas.map((e, i) => (
            <li key={i} className="flex gap-3 px-4 py-2">
              <span className="shrink-0 text-muted-foreground w-5 text-right">{i + 1}.</span>
              <div>
                <span className="font-medium">{e.nome}</span>
                {e.descricao && <p className="text-xs text-muted-foreground mt-0.5">{e.descricao}</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground italic px-1">
          Selecione um processo para listar as etapas automaticamente.
        </p>
      )}
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export function PreencherSecoesContrato({
  secoes,
  clienteNome,
  valores,
  onChange,
  contexto,
}: {
  secoes: ContratoSecao[]
  clienteNome: string
  valores: Record<string, string>
  onChange: (variavel: string, val: string) => void
  contexto?: ContextoContrato | undefined
}) {
  const TIPO_LABEL: Record<string, string> = {
    cabecalho:         'Cabeçalho',
    lista_servicos:    'Serviços incluídos',
    pagamento:         'Pagamento',
    cronograma:        'Cronograma',
    clausula_texto:    'Cláusula',
    assinatura:        'Assinatura',
    descricao_servico: 'Serviço',
    lista_etapas:      'Etapas',
  }

  return (
    <div className="space-y-5">
      {secoes
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .map((secao) => {
          if (secao.tipo === 'descricao_servico') {
            return <DescricaoServicoSection key={secao.id} secao={secao} contexto={contexto} />
          }

          if (secao.tipo === 'lista_etapas') {
            return <ListaEtapasSection key={secao.id} secao={secao} contexto={contexto} />
          }

          if (secao.tipo === 'clausula_texto') {
            return (
              <div key={secao.id} className="rounded-md border bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{TIPO_LABEL[secao.tipo]}</Badge>
                  <span className="text-sm font-medium">{secao.titulo}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{secao.conteudo_html}</p>
              </div>
            )
          }

          if (secao.tipo === 'cabecalho') {
            return (
              <div key={secao.id} className="rounded-md border bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{TIPO_LABEL[secao.tipo]}</Badge>
                  <span className="text-sm font-medium">{secao.titulo}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  CONTRATANTE: <strong>{clienteNome || '—'}</strong>
                </p>
              </div>
            )
          }

          if (secao.tipo === 'cronograma') {
            return (
              <CronogramaSection
                key={secao.id}
                secao={secao}
                valores={valores}
                onChange={onChange}
                contexto={contexto}
              />
            )
          }

          const camposVisiveis = secao.campos.filter(
            (c) => c.tipo !== 'texto' || c.variavel !== 'cliente_nome',
          )

          if (camposVisiveis.length === 0) return null

          return (
            <div key={secao.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{TIPO_LABEL[secao.tipo]}</Badge>
                <span className="text-sm font-medium">{secao.titulo}</span>
              </div>
              {secao.tipo === 'lista_servicos' ? (
                <div className="space-y-2 rounded-md border bg-muted/20 px-4 py-3">
                  {secao.campos.map((c) => (
                    <CampoInput
                      key={c.id}
                      variavel={c.variavel}
                      label={c.label}
                      tipo={c.tipo}
                      obrigatorio={c.obrigatorio}
                      valor={valores[c.variavel] ?? (c.valor_padrao ?? '')}
                      onChange={(v) => onChange(c.variavel, v)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {camposVisiveis.map((c) => (
                    <CampoInput
                      key={c.id}
                      variavel={c.variavel}
                      label={c.label}
                      tipo={c.tipo}
                      obrigatorio={c.obrigatorio}
                      valor={valores[c.variavel] ?? (c.valor_padrao ?? '')}
                      onChange={(v) => onChange(c.variavel, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}
