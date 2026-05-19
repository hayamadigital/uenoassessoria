import type { ContratoSecao } from '@ueno/firebase'

export type ValoresSecoes = Record<string, string>

export type ContextoContrato = {
  servico?: {
    nome: string
    descricao: string | null
    preco_jpy: number | null
    preco_variavel: boolean
    preco_min_jpy: number | null
    preco_max_jpy: number | null
    duracao_texto: string | null
  }
  variacao?: {
    nome: string
    descricao: string | null
    preco_jpy: number | null
    preco_variavel: boolean
    preco_min_jpy: number | null
    preco_max_jpy: number | null
    duracao_texto: string | null
  } | null
  etapaTemplates?: { nome: string; descricao: string | null }[]
  parcelas?: { numero: number; data_vencimento: string | null; valor_original_jpy: number }[]
}

function fmt(valor: string | undefined, tipo: string): string {
  if (!valor) return '___________'
  if (tipo === 'valor_jpy') {
    const n = Number(valor.replace(/[^0-9]/g, ''))
    return isNaN(n) ? valor : `¥${n.toLocaleString('ja-JP')}`
  }
  if (tipo === 'data') {
    const d = new Date(valor)
    if (isNaN(d.getTime())) return valor
    return d.toLocaleDateString('pt-BR', { timeZone: 'Asia/Tokyo' })
  }
  return valor
}

function fmtDate(iso: string | null): string {
  if (!iso) return '___________'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR', { timeZone: 'Asia/Tokyo' })
}

const S = {
  secao:  'margin-top:28px;',
  titulo: 'font-size:15px;font-weight:bold;margin:0 0 10px 0;color:#111;',
  p:      'margin:6px 0;line-height:1.7;color:#333;',
  ul:     'margin:8px 0 8px 20px;padding:0;line-height:1.7;color:#333;',
  ol:     'margin:8px 0 8px 20px;padding:0;line-height:1.7;color:#333;',
  li:     'margin-bottom:4px;',
  td:     'padding:7px 12px;border:1px solid #ccc;font-size:14px;',
  tdKey:  'padding:7px 12px;border:1px solid #ccc;font-size:14px;width:130px;font-weight:600;background:#f9f9f9;',
}

function renderCabecalho(secao: ContratoSecao, valores: ValoresSecoes): string {
  const clienteNome = valores['cliente_nome'] ?? '___________'
  return `
    <div style="text-align:center;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #222;">
      <h2 style="font-size:18px;font-weight:bold;margin:0 0 4px 0;color:#111;">${secao.titulo}</h2>
    </div>
    <div style="margin-bottom:20px;">
      <p style="${S.p}"><strong>CONTRATANTE:</strong> ${clienteNome}</p>
      <p style="${S.p}"><strong>CONTRATADO:</strong> UENO ASSESSORIA</p>
    </div>`
}

function renderDescricaoServico(secao: ContratoSecao, contexto?: ContextoContrato): string {
  const s = contexto?.servico
  const v = contexto?.variacao
  if (!s) {
    return `
      <div style="${S.secao}">
        <h3 style="${S.titulo}">${secao.titulo}</h3>
        <p style="${S.p}">Informações do serviço serão preenchidas conforme contratado.</p>
      </div>`
  }
  const preco = v?.preco_jpy ?? s.preco_jpy
  const precoVariavel = v?.preco_variavel ?? s.preco_variavel
  const precoMin = v?.preco_min_jpy ?? s.preco_min_jpy
  const precoMax = v?.preco_max_jpy ?? s.preco_max_jpy
  const duracao = v?.duracao_texto ?? s.duracao_texto
  let precoTxt: string
  if (preco) {
    precoTxt = `¥${preco.toLocaleString('ja-JP')}`
  } else if (precoVariavel && precoMin && precoMax) {
    precoTxt = `¥${precoMin.toLocaleString('ja-JP')} ~ ¥${precoMax.toLocaleString('ja-JP')}`
  } else {
    precoTxt = 'A definir'
  }
  const rows = [
    `<tr><td style="${S.tdKey}">Serviço</td><td style="${S.td}">${s.nome}</td></tr>`,
    v ? `<tr><td style="${S.tdKey}">Modalidade</td><td style="${S.td}">${v.nome}</td></tr>` : '',
    (v?.descricao ?? s.descricao) ? `<tr><td style="${S.tdKey}">Descrição</td><td style="${S.td}">${v?.descricao ?? s.descricao}</td></tr>` : '',
    duracao ? `<tr><td style="${S.tdKey}">Duração</td><td style="${S.td}">${duracao}</td></tr>` : '',
    `<tr><td style="${S.tdKey}">Valor</td><td style="${S.td}"><strong>${precoTxt}</strong></td></tr>`,
  ].filter(Boolean).join('\n')
  return `
    <div style="${S.secao}">
      <h3 style="${S.titulo}">${secao.titulo}</h3>
      <table style="border-collapse:collapse;width:100%;margin-top:8px;">${rows}</table>
    </div>`
}

function renderListaEtapas(secao: ContratoSecao, contexto?: ContextoContrato): string {
  const etapas = contexto?.etapaTemplates ?? []
  if (etapas.length === 0) {
    return `
      <div style="${S.secao}">
        <h3 style="${S.titulo}">${secao.titulo}</h3>
        <p style="${S.p}">As etapas do processo serão definidas conforme o serviço contratado.</p>
      </div>`
  }
  const itens = etapas
    .map((e, i) => `<li style="${S.li}"><strong>${i + 1}.</strong> ${e.nome}${e.descricao ? ` — <span style="color:#555;">${e.descricao}</span>` : ''}</li>`)
    .join('\n')
  return `
    <div style="${S.secao}">
      <h3 style="${S.titulo}">${secao.titulo}</h3>
      <ol style="${S.ol}">${itens}</ol>
    </div>`
}

function renderListaServicos(secao: ContratoSecao, valores: ValoresSecoes): string {
  const itens = secao.campos
    .filter((c) => c.tipo === 'booleano')
    .filter((c) => valores[c.variavel] !== 'false')
    .map((c) => `<li style="${S.li}">${c.label};</li>`)
    .join('\n')
  return `
    <div style="${S.secao}">
      <h3 style="${S.titulo}">${secao.titulo}</h3>
      <p style="${S.p}">${secao.conteudo_html ?? ''}</p>
      <ul style="${S.ul}">${itens}</ul>
    </div>`
}

function renderPagamento(secao: ContratoSecao, valores: ValoresSecoes): string {
  const valorTotal = fmt(valores['valor_total_jpy'], 'valor_jpy')
  const numParcelas = valores['num_parcelas'] ?? '1'
  return `
    <div style="${S.secao}">
      <h3 style="${S.titulo}">${secao.titulo}</h3>
      <ul style="${S.ul}">
        <li style="${S.li}">O valor total da assessoria é de <strong>${valorTotal}</strong>, podendo ser parcelado em até <strong>${numParcelas}</strong> vez(es) para facilitar o processo.</li>
        <li style="${S.li}">O CONTRATANTE compromete-se a pagar conforme o acordo assinado.</li>
        <li style="${S.li}">Em caso de atraso no pagamento, será cobrada multa de ¥100 por dia.</li>
        <li style="${S.li}">Todos os pagamentos devem ser informados por meio de aviso ou envio de comprovante.</li>
        <li style="${S.li}">Aulas práticas (extras) deverão ser pagas no mesmo dia da sua realização. O não pagamento no dia implicará em multa, conforme previsto neste contrato.</li>
      </ul>
      <p style="${S.p}"><strong>Valores das aulas extras (pacote de 2 horas):</strong></p>
      <ul style="${S.ul}">
        <li style="${S.li}">Carro automático: ¥12.000</li>
        <li style="${S.li}">Carro manual: ¥15.000</li>
      </ul>
    </div>`
}

function renderCronograma(secao: ContratoSecao, valores: ValoresSecoes, contexto?: ContextoContrato): string {
  const ORDINALS = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª']

  if (contexto?.parcelas && contexto.parcelas.length > 0) {
    const rows = contexto.parcelas.map((p, i) => `
      <tr>
        <td style="${S.tdKey}">${ORDINALS[i] ?? `${p.numero}ª`} parcela</td>
        <td style="${S.td}">${fmtDate(p.data_vencimento)}</td>
        <td style="${S.td}">¥${p.valor_original_jpy.toLocaleString('ja-JP')}</td>
      </tr>`).join('')
    return `
      <div style="${S.secao}">
        <h3 style="${S.titulo}">${secao.titulo}</h3>
        <table style="border-collapse:collapse;width:100%;margin-top:8px;">${rows}</table>
      </div>`
  }

  const numParcelas = parseInt(valores['num_parcelas'] ?? '5', 10)
  const max = Math.min(isNaN(numParcelas) ? 5 : numParcelas, 5)
  const rows = Array.from({ length: max }, (_, i) => {
    const n = i + 1
    const data  = fmt(valores[`parcela_${n}_data`],  'data')
    const valor = fmt(valores[`parcela_${n}_valor`], 'valor_jpy')
    return `
      <tr>
        <td style="${S.tdKey}">${ORDINALS[i]} parcela</td>
        <td style="${S.td}">${data}</td>
        <td style="${S.td}">${valor}</td>
      </tr>`
  }).join('')
  return `
    <div style="${S.secao}">
      <h3 style="${S.titulo}">${secao.titulo}</h3>
      <table style="border-collapse:collapse;width:100%;margin-top:8px;">
        ${rows}
      </table>
    </div>`
}

function renderClausulaTexto(secao: ContratoSecao): string {
  return `
    <div style="${S.secao}">
      <h3 style="${S.titulo}">${secao.titulo}</h3>
      <p style="${S.p}">${secao.conteudo_html ?? ''}</p>
    </div>`
}

function renderAssinatura(_secao: ContratoSecao, valores: ValoresSecoes): string {
  const data = fmt(valores['data_hoje'], 'data')
  return `
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #ddd;">
      <p style="${S.p}">Data: <strong>${data}</strong></p>
      <div style="margin-top:40px;">
        <p style="margin:0;border-top:1px solid #333;display:inline-block;min-width:260px;padding-top:6px;font-size:13px;color:#555;">
          Assinatura do CONTRATANTE
        </p>
      </div>
      <p style="margin-top:16px;${S.p}">Estou ciente e concordo com o contrato da UENO ASSESSORIA.</p>
    </div>`
}

export function renderSecoes(secoes: ContratoSecao[], valores: ValoresSecoes, contexto?: ContextoContrato): string {
  const partes = secoes
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((secao) => {
      switch (secao.tipo) {
        case 'cabecalho':         return renderCabecalho(secao, valores)
        case 'lista_servicos':    return renderListaServicos(secao, valores)
        case 'pagamento':         return renderPagamento(secao, valores)
        case 'cronograma':        return renderCronograma(secao, valores, contexto)
        case 'clausula_texto':    return renderClausulaTexto(secao)
        case 'assinatura':        return renderAssinatura(secao, valores)
        case 'descricao_servico': return renderDescricaoServico(secao, contexto)
        case 'lista_etapas':      return renderListaEtapas(secao, contexto)
        default: return ''
      }
    })
  return `<div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:48px 40px;line-height:1.6;color:#222;">${partes.join('\n')}</div>`
}

export function valoresDefaultDasSecoes(secoes: ContratoSecao[]): ValoresSecoes {
  const valores: ValoresSecoes = {}
  for (const secao of secoes) {
    for (const campo of secao.campos) {
      if (campo.tipo === 'booleano') {
        valores[campo.variavel] = campo.valor_padrao ?? 'true'
      } else if (campo.valor_padrao) {
        valores[campo.variavel] = campo.valor_padrao
      }
    }
  }
  const hoje = new Date().toISOString().split('T')[0] ?? ''
  if (!valores['data_hoje']) valores['data_hoje'] = hoje
  return valores
}
