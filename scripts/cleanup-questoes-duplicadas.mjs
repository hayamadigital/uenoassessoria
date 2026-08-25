import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/index.js'))

const applyChanges = process.argv.includes('--apply')

const serviceAccountPath = resolve(__dirname, '../service-account.json')
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
} catch {
  console.error('Arquivo service-account.json não encontrado.')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
})

const db = admin.firestore()
const bucket = admin.storage().bucket()

function decodeHtmlEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 16)))
}

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function stripLeadingQuestionNumber(text) {
  return text.replace(/^\s*\d+\s*[.)-]?\s*/, '')
}

function cleanText(text) {
  return decodeHtmlEntities(String(text ?? ''))
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeQuestionText(text) {
  return stripDiacritics(stripLeadingQuestionNumber(cleanText(text)))
    .toLowerCase()
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDate(value) {
  const ts = Date.parse(String(value ?? ''))
  return Number.isNaN(ts) ? 0 : ts
}

function uniquePush(map, key, value) {
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(value)
}

async function deleteCollection(ref) {
  const snap = await ref.get()
  await Promise.all(snap.docs.map((d) => d.ref.delete()))
}

async function deleteQuestionStorage(questionId) {
  const prefix = `imagens/questoes/${questionId}/`
  const [files] = await bucket.getFiles({ prefix })
  await Promise.all(files.map((file) => file.delete().catch(() => null)))
}

async function updateQuestaoRefs(targetMap) {
  const reportSnap = await db.collection('questao_erro_reports').get()
  const updates = reportSnap.docs
    .map((docSnap) => {
      const questaoId = String(docSnap.data().questao_id ?? '')
      const nextQuestaoId = targetMap.get(questaoId)
      if (!nextQuestaoId || nextQuestaoId === questaoId) return null
      return {
        ref: docSnap.ref,
        data: { questao_id: nextQuestaoId, updated_at: new Date().toISOString() },
      }
    })
    .filter(Boolean)

  for (let i = 0; i < updates.length; i += 450) {
    const batch = db.batch()
    for (const item of updates.slice(i, i + 450)) {
      batch.update(item.ref, item.data)
    }
    if (applyChanges) {
      await batch.commit()
    }
  }

  return updates.length
}

async function rewriteSimulados(replacementPlan) {
  let updatedSimulados = 0

  for (const [simuladoId, questaoIds] of replacementPlan.entries()) {
    const questoesRef = db.collection('simulado_config').doc(simuladoId).collection('questoes')
    const existingSnap = await questoesRef.get()

    if (applyChanges) {
      const deleteBatch = db.batch()
      for (const docSnap of existingSnap.docs) {
        deleteBatch.delete(docSnap.ref)
      }
      await deleteBatch.commit()

      const writeBatch = db.batch()
      questaoIds.forEach((questao_id, ordem) => {
        writeBatch.create(questoesRef.doc(), { questao_id, ordem })
      })
      await writeBatch.commit()
    }

    updatedSimulados++
  }

  return updatedSimulados
}

const questoesSnap = await db.collection('questoes').get()
const questoes = questoesSnap.docs.map((d) => ({
  id: d.id,
  enunciado: String(d.data().enunciado ?? ''),
  categoria_id: (d.data().categoria_id ?? null),
  tipo_opcao: String(d.data().tipo_opcao ?? ''),
  created_at: String(d.data().created_at ?? ''),
  updated_at: String(d.data().updated_at ?? ''),
}))

const byNormalized = new Map()
for (const questao of questoes) {
  uniquePush(byNormalized, normalizeQuestionText(questao.enunciado), questao)
}

const usageSnap = await db.collectionGroup('questoes').get()
const usageCounts = new Map()
for (const docSnap of usageSnap.docs) {
  const questaoId = String(docSnap.data().questao_id ?? '')
  if (!questaoId) continue
  usageCounts.set(questaoId, (usageCounts.get(questaoId) ?? 0) + 1)
}

const duplicateGroups = [...byNormalized.values()].filter((group) => group.length > 1)

const keepByDuplicateId = new Map()
const removeIds = new Set()
const duplicateReport = []

for (const group of duplicateGroups) {
  const sorted = [...group].sort((a, b) => {
    const usageDiff = (usageCounts.get(b.id) ?? 0) - (usageCounts.get(a.id) ?? 0)
    if (usageDiff !== 0) return usageDiff
    const dateDiff = parseDate(a.created_at) - parseDate(b.created_at)
    if (dateDiff !== 0) return dateDiff
    return a.id.localeCompare(b.id)
  })

  const keep = sorted[0]
  const removed = sorted.slice(1)

  for (const dup of removed) {
    keepByDuplicateId.set(dup.id, keep.id)
    removeIds.add(dup.id)
  }

  duplicateReport.push({
    keepId: keep.id,
    keepText: keep.enunciado,
    removedIds: removed.map((item) => item.id),
    count: group.length,
  })
}

const simuladoConfigsSnap = await db.collection('simulado_config').get()
const simuladoOrders = new Map()
const simuladoQuestaoIds = new Map()

for (const simuladoSnap of simuladoConfigsSnap.docs) {
  const questoesSnap = await simuladoSnap.ref.collection('questoes').orderBy('ordem').get()
  const ids = questoesSnap.docs.map((docSnap) => String(docSnap.data().questao_id ?? ''))
  simuladoOrders.set(simuladoSnap.id, ids)
  simuladoQuestaoIds.set(simuladoSnap.id, new Set(ids))
}

const allCanonicalQuestions = questoes
  .filter((questao) => !removeIds.has(questao.id))
  .map((questao) => ({
    ...questao,
    usage: usageCounts.get(questao.id) ?? 0,
  }))
  .sort((a, b) => {
    const categoryA = a.categoria_id ?? ''
    const categoryB = b.categoria_id ?? ''
    if (categoryA !== categoryB) return categoryA.localeCompare(categoryB)
    const usageDiff = a.usage - b.usage
    if (usageDiff !== 0) return usageDiff
    const dateDiff = parseDate(a.created_at) - parseDate(b.created_at)
    if (dateDiff !== 0) return dateDiff
    return a.id.localeCompare(b.id)
  })

const categoryPools = new Map()
for (const questao of allCanonicalQuestions) {
  const key = questao.categoria_id ?? '__sem_categoria__'
  uniquePush(categoryPools, key, questao)
}

const replacementPlan = new Map()
const migrationPlan = new Map()
let replacementsNeeded = 0
let replacementsResolved = 0
let replacementsByCanonical = 0
let unresolved = 0

for (const [simuladoId, ids] of simuladoOrders.entries()) {
  const used = new Set(ids.filter(Boolean))
  const nextIds = [...ids]
  let changed = false

  for (let index = 0; index < nextIds.length; index++) {
    const currentId = nextIds[index]
    if (!removeIds.has(currentId)) continue

    replacementsNeeded++
    const canonicalId = keepByDuplicateId.get(currentId)
    let replacementId = null

    if (canonicalId && !used.has(canonicalId)) {
      replacementId = canonicalId
      replacementsByCanonical++
    } else {
      const removedQuestao = questoes.find((questao) => questao.id === currentId)
      const categoryKey = (removedQuestao?.categoria_id ?? null) ?? '__sem_categoria__'
      const pools = []
      if (categoryPools.has(categoryKey)) pools.push(categoryPools.get(categoryKey))
      pools.push(allCanonicalQuestions)

      for (const pool of pools) {
        for (const candidate of pool) {
          if (removeIds.has(candidate.id)) continue
          if (used.has(candidate.id)) continue
          replacementId = candidate.id
          break
        }
        if (replacementId) break
      }
    }

    if (!replacementId) {
      unresolved++
      continue
    }

    nextIds[index] = replacementId
    used.add(replacementId)
    migrationPlan.set(currentId, canonicalId && canonicalId !== currentId ? canonicalId : replacementId)
    changed = true
    replacementsResolved++
  }

  if (changed) {
    replacementPlan.set(simuladoId, nextIds)
  }
}

const affectedSimulados = replacementPlan.size
const reportsToMigrate = [...migrationPlan.keys()].length

console.log(`Questões totais: ${questoes.length}`)
console.log(`Grupos duplicados: ${duplicateGroups.length}`)
console.log(`Questões marcadas para remoção: ${removeIds.size}`)
console.log(`Simulados afetados: ${affectedSimulados}`)
console.log(`Substituições necessárias: ${replacementsNeeded}`)
console.log(`Substituições resolvidas: ${replacementsResolved}`)
console.log(`Substituições por questão canônica: ${replacementsByCanonical}`)
console.log(`Reports a migrar: ${reportsToMigrate}`)
console.log(`Modo: ${applyChanges ? 'APLICAR' : 'DRY-RUN'}`)

if (!applyChanges) {
  const preview = duplicateReport.slice(0, 8).map((item) => ({
    keepId: item.keepId,
    removedIds: item.removedIds,
    count: item.count,
  }))
  console.log(JSON.stringify(preview, null, 2))
  if (unresolved > 0) {
    console.log(`AVISO: ${unresolved} substituição(ões) ficaram sem candidato no dry-run.`)
  }
  process.exit(0)
}

if (unresolved > 0) {
  throw new Error(`Não foi possível substituir ${unresolved} questão(ões) duplicada(s).`)
}

const migratedReports = await updateQuestaoRefs(migrationPlan)
const updatedSimulados = await rewriteSimulados(replacementPlan)

for (const questaoId of removeIds) {
  const questaoRef = db.collection('questoes').doc(questaoId)
  await deleteCollection(questaoRef.collection('opcoes'))
  await deleteCollection(questaoRef.collection('imagens'))
  await deleteCollection(questaoRef.collection('erros'))
  await deleteQuestionStorage(questaoId)
  await questaoRef.delete()
}

console.log(`Reports migrados: ${migratedReports}`)
console.log(`Simulados regravados: ${updatedSimulados}`)
console.log(`Questões removidas: ${removeIds.size}`)
console.log('Limpeza concluída com sucesso.')
