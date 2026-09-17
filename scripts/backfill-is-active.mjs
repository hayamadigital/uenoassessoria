// Backfill de `is_active` em `materiais` e `servicos`.
//
// A filtragem de conteúdo ativo (docs/acesso-por-cliente-especificacao.md, seção 9) passou a
// usar where('is_active', '==', true) direto no Firestore. Documentos antigos sem esse campo
// eram tratados como ativos só no cliente (default aplicado na leitura); um where() nativo não
// casa com campo ausente, então esses documentos desapareceriam das listagens sem este backfill.
//
// Uso:
//   node scripts/backfill-is-active.mjs           # dry-run (não escreve nada)
//   node scripts/backfill-is-active.mjs --apply   # aplica as mudanças

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

async function backfillCollection(name, { legacyField } = {}) {
  const snap = await db.collection(name).get()
  const missing = []
  for (const doc of snap.docs) {
    const data = doc.data()
    if (typeof data.is_active === 'boolean') continue
    // is_active ausente: herda de um campo legado booleano se houver, senão assume ativo
    // (mesmo default que a normalização client-side já aplicava na leitura).
    const inferred = legacyField && typeof data[legacyField] === 'boolean' ? data[legacyField] : true
    missing.push({ id: doc.id, inferred })
  }
  console.log(`${name}: ${snap.size} documentos, ${missing.length} sem is_active`)
  for (const { id, inferred } of missing) {
    console.log(`  - ${name}/${id} -> is_active: ${inferred}`)
  }
  if (APPLY && missing.length > 0) {
    const batchSize = 400
    for (let i = 0; i < missing.length; i += batchSize) {
      const batch = db.batch()
      for (const { id, inferred } of missing.slice(i, i + batchSize)) {
        batch.update(db.collection(name).doc(id), { is_active: inferred })
      }
      await batch.commit()
    }
    console.log(`  aplicado em ${missing.length} documentos.`)
  }
  return missing.length
}

const materiaisCount = await backfillCollection('materiais')
const servicosCount = await backfillCollection('servicos', { legacyField: 'ativo' })

console.log('')
console.log(APPLY
  ? `Aplicado: ${materiaisCount + servicosCount} documentos atualizados.`
  : `Dry-run: ${materiaisCount + servicosCount} documentos seriam atualizados. Rode com --apply para aplicar.`)
