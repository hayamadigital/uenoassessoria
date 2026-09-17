// Backfill de servico_snapshot/variacao_snapshot em cliente_processos criados antes
// do modelo de snapshot (docs/acesso-por-cliente-especificacao.md, seção 9/commit 8d7a73f).
//
// Auditoria de 17/09/2026 (docs/app-store-auditoria-2026-09-17.md) encontrou 5 de 5
// processos em produção sem servico_snapshot. A leitura já tem um fallback defensivo
// (packages/firebase/src/queries/processos.ts) que evita crash, mas o nome/preço exibido
// fica genérico até este backfill rodar.
//
// Uso:
//   node scripts/backfill-cliente-processos-snapshot.mjs           # dry-run (não escreve nada)
//   node scripts/backfill-cliente-processos-snapshot.mjs --apply   # aplica as mudanças

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

function servicoSnapshotFrom(data) {
  return {
    nome: data.nome ?? 'Serviço',
    descricao: data.descricao ?? null,
    duracao_min: typeof data.duracao_min === 'number' ? data.duracao_min : 0,
    duracao_texto: data.duracao_texto ?? null,
    preco_jpy: typeof data.preco_jpy === 'number' ? data.preco_jpy : 0,
    preco_variavel: data.preco_variavel === true,
    preco_min_jpy: data.preco_min_jpy ?? null,
    preco_max_jpy: data.preco_max_jpy ?? null,
    usa_variacoes: data.usa_variacoes === true,
    imagem_url: data.imagem_url ?? null,
    is_active: data.is_active !== false,
    ordem: typeof data.ordem === 'number' ? data.ordem : 0,
    created_at: data.created_at ?? '',
    updated_at: data.updated_at ?? '',
  }
}

function variacaoSnapshotFrom(data) {
  return {
    nome: data.nome ?? 'Variação',
    descricao: data.descricao ?? null,
    duracao_texto: data.duracao_texto ?? null,
    preco_jpy: data.preco_jpy ?? null,
    preco_variavel: data.preco_variavel === true,
    preco_min_jpy: data.preco_min_jpy ?? null,
    preco_max_jpy: data.preco_max_jpy ?? null,
    usa_variacoes: data.usa_variacoes === true,
    ativo: data.ativo !== false,
    is_active: data.is_active !== false,
    ordem: typeof data.ordem === 'number' ? data.ordem : 0,
    created_at: data.created_at ?? '',
    updated_at: data.updated_at ?? '',
  }
}

const snap = await db.collection('cliente_processos').get()
console.log(`cliente_processos: ${snap.size} documentos`)

const updates = []
for (const doc of snap.docs) {
  const data = doc.data()
  if (data.servico_snapshot) continue

  const servicoSnap = await db.collection('servicos').doc(data.servico_id).get()
  if (!servicoSnap.exists) {
    console.log(`  - ${doc.id}: servico_id=${data.servico_id} não existe mais, PULANDO (revisar manualmente)`)
    continue
  }
  const servico_snapshot = servicoSnapshotFrom(servicoSnap.data())

  let variacao_snapshot = null
  if (data.variacao_id) {
    const variacaoSnap = await db.collection('servico_variacoes').doc(data.variacao_id).get()
    if (variacaoSnap.exists) variacao_snapshot = variacaoSnapshotFrom(variacaoSnap.data())
  }

  updates.push({ id: doc.id, servico_snapshot, variacao_snapshot })
  console.log(`  - ${doc.id}: servico_snapshot.nome="${servico_snapshot.nome}"${variacao_snapshot ? `, variacao_snapshot.nome="${variacao_snapshot.nome}"` : ''}`)
}

console.log('')
if (APPLY) {
  for (const { id, servico_snapshot, variacao_snapshot } of updates) {
    await db.collection('cliente_processos').doc(id).update({ servico_snapshot, variacao_snapshot })
  }
  console.log(`Aplicado: ${updates.length} processos atualizados.`)
} else {
  console.log(`Dry-run: ${updates.length} processos seriam atualizados. Rode com --apply para aplicar.`)
}
