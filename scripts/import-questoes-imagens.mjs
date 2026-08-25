import { readFileSync, existsSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { resolve, dirname, basename, extname } from 'path'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/index.js'))
const { getDownloadURL } = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/storage/index.js'))

const csvPath = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

if (!csvPath) {
  console.error('Uso: node scripts/import-questoes-imagens.mjs <caminho-csv> [--dry-run]')
  process.exit(1)
}

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

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }

    if (ch === '\n') {
      row.push(field)
      field = ''
      if (row.some((value) => value.trim().length > 0)) rows.push(row)
      row = []
      continue
    }

    if (ch === '\r') {
      continue
    }

    field += ch
  }

  row.push(field)
  if (row.some((value) => value.trim().length > 0)) rows.push(row)
  return rows
}

function normalizeText(text) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function coreQuestionText(text) {
  const normalized = normalizeText(text)
  const questionMarkIndex = normalized.indexOf('?')
  if (questionMarkIndex !== -1) {
    return normalized.slice(0, questionMarkIndex + 1).trim()
  }
  return normalized
}

function contentTypeFromPath(filePath) {
  const ext = extname(filePath).toLowerCase()
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}

function questionImagePath(questaoId, filePath) {
  return `imagens/questoes/${questaoId}/${basename(filePath)}`
}

const csvText = readFileSync(csvPath, 'utf-8')
const rows = parseCsv(csvText)

if (rows.length === 0) {
  console.error('CSV vazio.')
  process.exit(1)
}

const headers = rows.shift().map((header) => header.trim())
const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]))

const requiredHeaders = ['Arquivo', 'Pergunta', 'Caminho da Imagem Baixada']
for (const header of requiredHeaders) {
  if (!(header in headerIndex)) {
    console.error(`Cabeçalho ausente no CSV: ${header}`)
    process.exit(1)
  }
}

const entries = rows.map((row) => ({
  arquivo: row[headerIndex.Arquivo]?.trim() ?? '',
  pergunta: row[headerIndex.Pergunta]?.trim() ?? '',
  caminho: row[headerIndex['Caminho da Imagem Baixada']]?.trim() ?? '',
}))

const questoesSnap = await db.collection('questoes').get()
const questoesByPergunta = new Map()
const questoesByCorePergunta = new Map()

for (const docSnap of questoesSnap.docs) {
  const data = docSnap.data()
  const key = normalizeText(String(data.enunciado ?? ''))
  const coreKey = coreQuestionText(String(data.enunciado ?? ''))
  if (!questoesByPergunta.has(key)) {
    questoesByPergunta.set(key, [])
  }
  questoesByPergunta.get(key).push(docSnap)

  if (!questoesByCorePergunta.has(coreKey)) {
    questoesByCorePergunta.set(coreKey, [])
  }
  questoesByCorePergunta.get(coreKey).push(docSnap)
}

const results = []
let matchedRows = 0
let matchedDocs = 0
let missing = 0
let uploaded = 0

for (const entry of entries) {
  const key = normalizeText(entry.pergunta)
  const coreKey = coreQuestionText(entry.pergunta)
  let matches = questoesByPergunta.get(key) ?? []

  if (matches.length === 0) {
    matches = questoesByCorePergunta.get(coreKey) ?? []
  }

  if (matches.length === 0) {
    results.push({ ...entry, status: 'nao_encontrada' })
    missing++
    continue
  }

  const localPath = entry.caminho

  if (!existsSync(localPath)) {
    results.push({ ...entry, status: 'arquivo_ausente', questaoIds: matches.map((doc) => doc.id) })
    missing++
    continue
  }

  const primaryQuestaoDoc = matches[0]
  const storagePath = questionImagePath(primaryQuestaoDoc.id, localPath)
  const token = crypto.randomUUID()

  results.push({
    ...entry,
    status: matches.length > 1 ? 'ok-duplicado' : 'ok',
    questaoIds: matches.map((doc) => doc.id),
    storagePath,
  })

  if (dryRun) {
    matchedRows++
    matchedDocs += matches.length
    continue
  }

  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: contentTypeFromPath(localPath),
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  })

  const file = bucket.file(storagePath)
  const url = await getDownloadURL(file)
  const now = new Date().toISOString()

  for (const questaoDoc of matches) {
    const imagensRef = db.collection('questoes').doc(questaoDoc.id).collection('imagens')
    const currentImagensSnap = await imagensRef.get()
    await Promise.all(currentImagensSnap.docs.map((doc) => doc.ref.delete()))

    await imagensRef.add({
      questao_id: questaoDoc.id,
      url,
      ordem: 0,
      created_at: now,
    })

    uploaded++
    matchedDocs++
    console.log(`Atualizada questão ${questaoDoc.id}: ${entry.arquivo}`)
  }

  matchedRows++
}

console.log('')
console.log(`Total no CSV: ${entries.length}`)
console.log(`Linhas encontradas: ${matchedRows}`)
console.log(`Documentos atualizados: ${matchedDocs}`)
console.log(`Falhas: ${missing}`)
if (dryRun) {
  console.log('Modo dry-run: nenhum upload ou escrita foi realizado.')
}
if (results.length > 0) {
  console.log('')
  console.log(JSON.stringify(results, null, 2))
}
if (!dryRun) {
  console.log(`Uploads realizados: ${uploaded}`)
}

process.exit(0)
