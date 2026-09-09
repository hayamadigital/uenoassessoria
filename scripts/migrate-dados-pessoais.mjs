// Migração de padronização dos "Dados Pessoais" do cliente.
//
// 1. observacoes            -> observacoes_internas   (campo passa a ser só da assessoria)
// 2. nacionalidade (texto)  -> código ISO 3166-1 alpha-2
// 3. cnh_* (campos achatados) -> subcoleção clientes/{id}/habilitacoes (pais: 'BR')
//
// Uso:
//   node scripts/migrate-dados-pessoais.mjs           # dry-run (não escreve nada)
//   node scripts/migrate-dados-pessoais.mjs --apply   # aplica as mudanças

import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const adminRoot = resolve(__dirname, '../functions/node_modules/firebase-admin/lib')
const { initializeApp, cert } = require(resolve(adminRoot, 'app'))
const { getFirestore, FieldValue } = require(resolve(adminRoot, 'firestore'))

const APPLY = process.argv.includes('--apply')

const serviceAccountPath = resolve(__dirname, '../service-account.json')
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
} catch {
  console.error('service-account.json não encontrado na raiz do repo.')
  process.exit(1)
}

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// ─── Normalização de nacionalidade → ISO 3166-1 alpha-2 ─────────────────────

const PAISES = [
  ['BR', 'Brasil', 'Brasileira'], ['JP', 'Japão', 'Japonesa'], ['PT', 'Portugal', 'Portuguesa'],
  ['US', 'Estados Unidos', 'Americana'], ['CA', 'Canadá', 'Canadense'], ['DE', 'Alemanha', 'Alemã'],
  ['IT', 'Itália', 'Italiana'], ['ES', 'Espanha', 'Espanhola'], ['FR', 'França', 'Francesa'],
  ['GB', 'Reino Unido', 'Britânica'], ['AR', 'Argentina', 'Argentina'], ['PY', 'Paraguai', 'Paraguaia'],
  ['PE', 'Peru', 'Peruana'], ['BO', 'Bolívia', 'Boliviana'], ['UY', 'Uruguai', 'Uruguaia'],
  ['CO', 'Colômbia', 'Colombiana'], ['VE', 'Venezuela', 'Venezuelana'], ['CL', 'Chile', 'Chilena'],
  ['MX', 'México', 'Mexicana'], ['CN', 'China', 'Chinesa'], ['KR', 'Coreia do Sul', 'Sul-coreana'],
  ['PH', 'Filipinas', 'Filipina'], ['VN', 'Vietnã', 'Vietnamita'], ['TH', 'Tailândia', 'Tailandesa'],
  ['IN', 'Índia', 'Indiana'], ['AU', 'Austrália', 'Australiana'], ['NZ', 'Nova Zelândia', 'Neozelandesa'],
]

const norm = (v) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

const LEGACY_TO_ISO = {}
for (const [code, nome, adj] of PAISES) {
  LEGACY_TO_ISO[norm(nome)] = code
  LEGACY_TO_ISO[norm(adj)] = code
  LEGACY_TO_ISO[norm(code)] = code
}
Object.assign(LEGACY_TO_ISO, {
  brasil: 'BR', japao: 'JP', portugal: 'PT', 'estados unidos': 'US',
  'estados unidos da america': 'US', eua: 'US', estadunidense: 'US',
  'norte-americana': 'US', norteamericana: 'US', peru: 'PE', bolivia: 'BO',
  paraguai: 'PY', uruguai: 'UY', filipinas: 'PH', japones: 'JP', brasileiro: 'BR',
})
const VALID_ISO = new Set(PAISES.map(([code]) => code))

function nacionalidadeToISO(value) {
  if (!value) return null
  const key = norm(value)
  if (!key || key === 'outra' || key === 'outros' || key === 'outro') return null
  return LEGACY_TO_ISO[key] ?? null
}

// ─── Migração ──────────────────────────────────────────────────────────────

const stats = {
  total: 0,
  observacoes: 0,
  nacionalidade: 0,
  nacionalidadeNaoReconhecida: [],
  habilitacoes: 0,
  habilitacoesJaMigrado: 0,
  habilitacoesPais: 0,
  habilitacoesPaisNaoReconhecido: [],
}

async function run() {
  const snap = await db.collection('clientes').get()
  stats.total = snap.size
  console.log(`${snap.size} clientes encontrados. Modo: ${APPLY ? 'APLICAR' : 'DRY-RUN'}\n`)

  for (const doc of snap.docs) {
    const c = doc.data()
    const id = doc.id
    const update = {}

    // 1. observacoes -> observacoes_internas (e remove o campo legado)
    if ('observacoes' in c) {
      const obs = (c.observacoes ?? '').trim()
      const internas = (c.observacoes_internas ?? '').trim()
      if (obs && internas && obs !== internas) {
        console.warn(`[${id}] observacoes E observacoes_internas divergem — NÃO removido, revisar manualmente`)
      } else {
        if (obs && !internas) {
          update.observacoes_internas = obs
          console.log(`[${id}] observacoes -> observacoes_internas (${obs.length} chars)`)
        }
        update.observacoes = FieldValue.delete()
        stats.observacoes++
      }
    }

    // 2. nacionalidade -> ISO
    const nac = (c.nacionalidade ?? '').trim()
    if (nac && !VALID_ISO.has(nac)) {
      const iso = nacionalidadeToISO(nac)
      if (iso) {
        update.nacionalidade = iso
        stats.nacionalidade++
        console.log(`[${id}] nacionalidade "${nac}" -> ${iso}`)
      } else {
        stats.nacionalidadeNaoReconhecida.push(`${id}: "${nac}"`)
        console.warn(`[${id}] nacionalidade "${nac}" NÃO reconhecida — mantida como está`)
      }
    }

    // 3. cnh_* -> subcoleção habilitacoes
    const temCnh = [c.cnh_numero, c.cnh_categoria, c.cnh_validade, c.cnh_estado_emissor]
      .some((v) => (v ?? '').trim())
    if (temCnh) {
      const habRef = db.collection('clientes').doc(id).collection('habilitacoes')
      const jaMigrado = await habRef.where('_migrated_from_cnh', '==', true).limit(1).get()
      if (!jaMigrado.empty) {
        stats.habilitacoesJaMigrado++
        console.log(`[${id}] habilitação da CNH já migrada — pulando`)
      } else {
        const now = new Date().toISOString()
        const estado = (c.cnh_estado_emissor ?? '').trim()
        const hab = {
          cliente_id: id,
          pais: 'BR',
          categoria: (c.cnh_categoria ?? '').trim() || null,
          nome_habilitacao: null,
          numero: (c.cnh_numero ?? '').trim() || null,
          data_emissao: null,
          data_vencimento: (c.cnh_validade ?? '').trim() || null,
          situacao: 'positiva',
          observacoes: estado ? `Estado emissor: ${estado}` : null,
          _migrated_from_cnh: true,
          created_at: now,
          updated_at: now,
        }
        stats.habilitacoes++
        console.log(`[${id}] cria habilitação BR:`, JSON.stringify({ ...hab, cliente_id: undefined }))
        if (APPLY) await habRef.add(hab)
      }
    }
    // remove os campos legados achatados (mesmo vazios / já migrados)
    for (const key of ['cnh_numero', 'cnh_categoria', 'cnh_validade', 'cnh_estado_emissor']) {
      if (key in c) update[key] = FieldValue.delete()
    }

    if (Object.keys(update).length > 0 && APPLY) {
      update.updated_at = new Date().toISOString()
      await doc.ref.update(update)
    }

    // 4. habilitacoes.pais (nome do país) -> ISO
    const habsSnap = await db.collection('clientes').doc(id).collection('habilitacoes').get()
    for (const hab of habsSnap.docs) {
      const pais = (hab.data().pais ?? '').trim()
      if (!pais || VALID_ISO.has(pais)) continue
      const iso = nacionalidadeToISO(pais)
      if (iso) {
        stats.habilitacoesPais++
        console.log(`[${id}/hab:${hab.id}] pais "${pais}" -> ${iso}`)
        if (APPLY) await hab.ref.update({ pais: iso, updated_at: new Date().toISOString() })
      } else {
        stats.habilitacoesPaisNaoReconhecido.push(`${id}/${hab.id}: "${pais}"`)
        console.warn(`[${id}/hab:${hab.id}] pais "${pais}" NÃO reconhecido — mantido`)
      }
    }
  }

  console.log('\n─── Resumo ───')
  console.log(`Clientes:                     ${stats.total}`)
  console.log(`observacoes -> internas:      ${stats.observacoes}`)
  console.log(`nacionalidade -> ISO:         ${stats.nacionalidade}`)
  console.log(`habilitações criadas (CNH):   ${stats.habilitacoes}`)
  console.log(`habilitações já migradas:     ${stats.habilitacoesJaMigrado}`)
  console.log(`habilitações pais -> ISO:     ${stats.habilitacoesPais}`)
  if (stats.nacionalidadeNaoReconhecida.length) {
    console.log(`\nNacionalidades não reconhecidas (${stats.nacionalidadeNaoReconhecida.length}):`)
    for (const l of stats.nacionalidadeNaoReconhecida) console.log(`  - ${l}`)
  }
  if (stats.habilitacoesPaisNaoReconhecido.length) {
    console.log(`\nPaíses de habilitação não reconhecidos (${stats.habilitacoesPaisNaoReconhecido.length}):`)
    for (const l of stats.habilitacoesPaisNaoReconhecido) console.log(`  - ${l}`)
  }
  if (!APPLY) console.log('\nDRY-RUN — nada foi gravado. Rode com --apply para aplicar.')
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err)
  process.exit(1)
})
