import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/index.js'))

const serviceAccountPath = resolve(__dirname, '../service-account.json')
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
} catch {
  console.error('service-account.json não encontrado.')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

// ─── Seções do contrato UENO ────────────────────────────────────────────────

const SECOES = [
  {
    id: 's_cabecalho',
    ordem: 1,
    tipo: 'cabecalho',
    titulo: 'Contrato de Prestação de Serviço – UENO ASSESSORIA',
    conteudo_html: null,
    campos: [
      {
        id: 'f_cliente_nome',
        label: 'Nome do contratante',
        tipo: 'texto',
        variavel: 'cliente_nome',
        obrigatorio: true,
        valor_padrao: null,
      },
    ],
  },
  {
    id: 's_assistencia',
    ordem: 2,
    tipo: 'lista_servicos',
    titulo: 'Cláusula 1 – Assistência',
    conteudo_html: 'O CONTRATADO compromete-se a prestar os seguintes serviços ao CONTRATANTE:',
    campos: [
      { id: 'f_jaf',           label: 'Tradução da habilitação do Brasil (JAF)',       tipo: 'booleano', variavel: 'servico_jaf',           obrigatorio: false, valor_padrao: 'true' },
      { id: 'f_menkyou',       label: 'Agendamento da entrevista no Menkyou Center',   tipo: 'booleano', variavel: 'servico_menkyou',       obrigatorio: false, valor_padrao: 'true' },
      { id: 'f_entrevista',    label: 'Entrevista presencial',                         tipo: 'booleano', variavel: 'servico_entrevista',    obrigatorio: false, valor_padrao: 'true' },
      { id: 'f_prova_escrita', label: 'Prova ESCRITA, 50 questões em português',       tipo: 'booleano', variavel: 'servico_prova_escrita', obrigatorio: false, valor_padrao: 'true' },
      { id: 'f_aula_pratica',  label: '2 horas de aula prática',                       tipo: 'booleano', variavel: 'servico_aula_pratica',  obrigatorio: false, valor_padrao: 'true' },
      { id: 'f_prova_volante', label: 'Prova de volante',                              tipo: 'booleano', variavel: 'servico_prova_volante', obrigatorio: false, valor_padrao: 'true' },
    ],
  },
  {
    id: 's_pagamento',
    ordem: 3,
    tipo: 'pagamento',
    titulo: 'Cláusula 2 – Pagamento',
    conteudo_html: null,
    campos: [
      { id: 'f_valor_total', label: 'Valor total da assessoria (¥)', tipo: 'valor_jpy',     variavel: 'valor_total_jpy', obrigatorio: true,  valor_padrao: null },
      { id: 'f_parcelas',    label: 'Número de parcelas',            tipo: 'numero_inteiro', variavel: 'num_parcelas',    obrigatorio: true,  valor_padrao: '1'  },
    ],
  },
  {
    id: 's_cronograma',
    ordem: 4,
    tipo: 'cronograma',
    titulo: 'Cronograma de Pagamentos',
    conteudo_html: null,
    campos: [
      { id: 'f_p1_data',  label: '1ª parcela – Data',     tipo: 'data',      variavel: 'parcela_1_data',  obrigatorio: false, valor_padrao: null },
      { id: 'f_p1_valor', label: '1ª parcela – Valor (¥)', tipo: 'valor_jpy', variavel: 'parcela_1_valor', obrigatorio: false, valor_padrao: null },
      { id: 'f_p2_data',  label: '2ª parcela – Data',     tipo: 'data',      variavel: 'parcela_2_data',  obrigatorio: false, valor_padrao: null },
      { id: 'f_p2_valor', label: '2ª parcela – Valor (¥)', tipo: 'valor_jpy', variavel: 'parcela_2_valor', obrigatorio: false, valor_padrao: null },
      { id: 'f_p3_data',  label: '3ª parcela – Data',     tipo: 'data',      variavel: 'parcela_3_data',  obrigatorio: false, valor_padrao: null },
      { id: 'f_p3_valor', label: '3ª parcela – Valor (¥)', tipo: 'valor_jpy', variavel: 'parcela_3_valor', obrigatorio: false, valor_padrao: null },
      { id: 'f_p4_data',  label: '4ª parcela – Data',     tipo: 'data',      variavel: 'parcela_4_data',  obrigatorio: false, valor_padrao: null },
      { id: 'f_p4_valor', label: '4ª parcela – Valor (¥)', tipo: 'valor_jpy', variavel: 'parcela_4_valor', obrigatorio: false, valor_padrao: null },
      { id: 'f_p5_data',  label: '5ª parcela – Data',     tipo: 'data',      variavel: 'parcela_5_data',  obrigatorio: false, valor_padrao: null },
      { id: 'f_p5_valor', label: '5ª parcela – Valor (¥)', tipo: 'valor_jpy', variavel: 'parcela_5_valor', obrigatorio: false, valor_padrao: null },
    ],
  },
  {
    id: 's_desmarcacao',
    ordem: 5,
    tipo: 'clausula_texto',
    titulo: 'Cláusula 3 – Desmarcação',
    conteudo_html: 'Caso o CONTRATANTE solicite alteração ou cancelamento de prova, entrevista ou aula prática, será cobrada a taxa de ¥5.000.',
    campos: [],
  },
  {
    id: 's_reprovacao',
    ordem: 6,
    tipo: 'clausula_texto',
    titulo: 'Cláusula 4 – Reprovação',
    conteudo_html: 'Em caso de reprovação em alguma etapa, será cobrado o valor de ¥5.000 para a próxima tentativa, a ser pago no dia do novo teste. O não pagamento da assessoria acarretará multa de ¥100 por dia de atraso até a regularização.',
    campos: [],
  },
  {
    id: 's_cancelamento',
    ordem: 7,
    tipo: 'clausula_texto',
    titulo: 'Cláusula 5 – Cancelamento',
    conteudo_html: 'Se o CONTRATANTE solicitar o cancelamento do processo após ter iniciado, o valor total da assessoria será cobrado integralmente. Parcelamos o valor justamente para facilitar o acesso ao serviço, e ao assinar este contrato o CONTRATANTE declara estar ciente dessa condição.',
    campos: [],
  },
  {
    id: 's_assinatura',
    ordem: 8,
    tipo: 'assinatura',
    titulo: 'Assinatura',
    conteudo_html: null,
    campos: [
      { id: 'f_data_hoje', label: 'Data do contrato', tipo: 'data', variavel: 'data_hoje', obrigatorio: true, valor_padrao: null },
    ],
  },
]

// ─── Upsert ──────────────────────────────────────────────────────────────────

const now = new Date().toISOString()

const snap = await db.collection('contrato_templates')
  .where('nome', '==', 'Contrato de Prestação de Serviço – UENO ASSESSORIA')
  .limit(1)
  .get()

if (!snap.empty) {
  await snap.docs[0].ref.update({ secoes: SECOES, updated_at: now })
  console.log(`Atualizado com seções: ${snap.docs[0].id}`)
} else {
  const ref = await db.collection('contrato_templates').add({
    nome: 'Contrato de Prestação de Serviço – UENO ASSESSORIA',
    corpo_html: '',
    secoes: SECOES,
    servico_id: null,
    is_default: true,
    created_at: now,
    updated_at: now,
  })
  console.log(`Template criado com seções: ${ref.id}`)
}

console.log('Pronto!')
process.exit(0)
