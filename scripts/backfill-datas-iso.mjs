// Normaliza datas puras gravadas em `DD/MM/AAAA` para o formato canônico ISO `AAAA-MM-DD`.
//
// Origem do problema: `selfRegister`/`createCliente` gravavam a data do cadastro crua, no
// formato BR em que o formulário a coletava, enquanto o resto do app assume ISO — por isso
// "Data inválida" na tela Perfil → Dados pessoais. O código já foi corrigido (as Functions
// normalizam na entrada); este script conserta o que já está gravado.
//
// Uso:
//   node scripts/backfill-datas-iso.mjs           # dry-run (não escreve nada)
//   node scripts/backfill-datas-iso.mjs --apply   # aplica as mudanças

import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const adminRoot = resolve(__dirname, '../functions/node_modules/firebase-admin/lib')
const { initializeApp, cert } = require(resolve(adminRoot, 'app'))
const { getFirestore } = require(resolve(adminRoot, 'firestore'))

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

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const BR_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/

function isRealDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

/** Devolve { iso } se precisa converter, { ok: true } se já está certo, { erro } se inválido. */
function analisar(value) {
  if (value == null || value === '') return { ok: true }
  if (typeof value !== 'string') return { erro: `tipo ${typeof value}` }
  const iso = ISO_RE.exec(value)
  if (iso) {
    return isRealDate(+iso[1], +iso[2], +iso[3]) ? { ok: true } : { erro: 'ISO inválida' }
  }
  const br = BR_RE.exec(value)
  if (br) {
    if (!isRealDate(+br[3], +br[2], +br[1])) return { erro: 'BR inválida' }
    return { iso: `${br[3]}-${br[2]}-${br[1]}` }
  }
  return { erro: 'formato desconhecido' }
}

// Campos de data pura por coleção. Subcoleções de cliente ficam em `subs`.
const CAMPOS_CLIENTE = ['data_nascimento', 'visto_validade', 'data_entrada_japao', 'cnh_validade']
const SUBS_CLIENTE = {
  habilitacoes: ['data_emissao', 'data_vencimento'],
  entrada_saida: ['data_viagem'],
}

let totalConvertidos = 0
let totalErros = 0

async function processarDoc(ref, data, campos, rotulo) {
  const updates = {}
  for (const campo of campos) {
    const r = analisar(data[campo])
    if (r.ok) continue
    if (r.erro) {
      console.log(`  ! ${rotulo}.${campo}: ${JSON.stringify(data[campo])} — ${r.erro} (REVISAR MANUALMENTE)`)
      totalErros++
      continue
    }
    console.log(`  - ${rotulo}.${campo}: ${data[campo]} → ${r.iso}`)
    updates[campo] = r.iso
    totalConvertidos++
  }
  if (APPLY && Object.keys(updates).length > 0) await ref.update(updates)
}

const clientes = await db.collection('clientes').get()
console.log(`clientes: ${clientes.size} documentos`)

for (const doc of clientes.docs) {
  await processarDoc(doc.ref, doc.data(), CAMPOS_CLIENTE, `clientes/${doc.id}`)
  for (const [sub, campos] of Object.entries(SUBS_CLIENTE)) {
    const snap = await doc.ref.collection(sub).get()
    for (const subDoc of snap.docs) {
      await processarDoc(subDoc.ref, subDoc.data(), campos, `clientes/${doc.id}/${sub}/${subDoc.id}`)
    }
  }
}

console.log('')
console.log(APPLY
  ? `Aplicado: ${totalConvertidos} campos convertidos.`
  : `Dry-run: ${totalConvertidos} campos seriam convertidos. Rode com --apply para aplicar.`)
if (totalErros > 0) {
  console.log(`${totalErros} campo(s) com valor inválido NÃO foram tocados — revisar à mão.`)
}
