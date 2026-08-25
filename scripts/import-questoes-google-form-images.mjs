import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { resolve, dirname, join } from 'path'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/index.js'))
const { getDownloadURL } = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/storage/index.js'))

const input = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

if (!input) {
  console.error('Uso: node scripts/import-questoes-google-form-images.mjs <form-url|html-path> [--dry-run]')
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

function stripTags(text) {
  return text.replace(/<[^>]+>/g, '')
}

function cleanText(text) {
  return decodeHtmlEntities(stripTags(text ?? ''))
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripLeadingQuestionNumber(text) {
  return text.replace(/^\s*\d+\s*[.)-]?\s*/,'')
}

function normalizeText(text) {
  return stripDiacritics(stripLeadingQuestionNumber(cleanText(text)))
    .toLowerCase()
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function coreQuestionText(text) {
  const raw = stripDiacritics(stripLeadingQuestionNumber(cleanText(text))).toLowerCase()
  const questionMarkIndex = raw.indexOf('?')
  if (questionMarkIndex !== -1) {
    return raw
      .slice(0, questionMarkIndex + 1)
      .replace(/[.,;:!?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  return raw
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function contentTypeToExt(contentType) {
  const type = String(contentType ?? '').split(';')[0].trim().toLowerCase()
  switch (type) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'bin'
  }
}

function questionImagePath(questaoId, index, ext) {
  return `imagens/questoes/${questaoId}/form-${String(index + 1).padStart(2, '0')}.${ext}`
}

async function loadInputHtml(source) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      },
    })
    if (!response.ok) {
      throw new Error(`Falha ao baixar o formulário: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  }

  return readFileSync(source, 'utf-8')
}

function parseQuestionBlocks(html) {
  const blocks = [...html.matchAll(/<div class=\"Qr7Oae\" role=\"listitem\">([\s\S]*?)<\/div><\/div><\/div><\/div>/g)]
  return blocks
    .map((match) => {
      const full = match[0]
      const block = match[1]
      const paramsMatch = full.match(/data-params=\"%\.\@\.\[(?:-?\d+),&quot;([\s\S]*?)&quot;/)
      const textMatch = block.match(/<span class=\"M7eMe\">([\s\S]*?)<\/span>/)
      const imgMatches = [...block.matchAll(/<img[^>]*src=\"([^\"]+)\"[^>]*>/g)].map((m) => m[1])
      const question = cleanText(decodeHtmlEntities(paramsMatch?.[1] ?? textMatch?.[1] ?? ''))
      return {
        question,
        coreQuestion: coreQuestionText(question),
        images: imgMatches,
      }
    })
    .filter((item) => item.images.length > 0)
}

async function downloadImage(url, destPath) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      referer: 'https://docs.google.com/',
    },
  })
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  mkdirSync(dirname(destPath), { recursive: true })
  writeFileSync(destPath, buffer)
  return {
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    size: buffer.length,
  }
}

const html = await loadInputHtml(input)
const items = parseQuestionBlocks(html)

if (items.length === 0) {
  console.error('Nenhuma pergunta com imagem foi encontrada no formulário.')
  process.exit(1)
}

const snap = await db.collection('questoes').get()
const byNorm = new Map()
const byCore = new Map()

for (const d of snap.docs) {
  const enunciado = String(d.data().enunciado ?? '')
  const norm = normalizeText(enunciado)
  const core = coreQuestionText(enunciado)
  if (!byNorm.has(norm)) byNorm.set(norm, [])
  if (!byCore.has(core)) byCore.set(core, [])
  byNorm.get(norm).push(d)
  byCore.get(core).push(d)
}

const tempRoot = resolve('/private/tmp', `forms-images-${crypto.randomUUID()}`)
mkdirSync(tempRoot, { recursive: true })

let matchedRows = 0
let matchedDocs = 0
let missing = 0
let uploaded = 0
const results = []

for (let i = 0; i < items.length; i++) {
  const item = items[i]
  let matches = byNorm.get(item.question) ?? byCore.get(item.coreQuestion) ?? []

  if (matches.length === 0) {
    results.push({
      question: item.question,
      status: 'nao_encontrada',
      imageUrl: item.images[0],
    })
    missing++
    continue
  }

  const imageUrl = item.images[0]
  const tempPath = join(tempRoot, `q-${String(i + 1).padStart(2, '0')}.bin`)

  let downloaded = { contentType: 'image/png', size: 0 }
  if (!dryRun) {
    downloaded = await downloadImage(imageUrl, tempPath)
  }

  const ext = contentTypeToExt(downloaded.contentType)
  const finalStorageExt = ext === 'bin' ? 'png' : ext
  const primaryQuestaoDoc = matches[0]
  const storagePath = questionImagePath(primaryQuestaoDoc.id, i, finalStorageExt)
  const token = crypto.randomUUID()

  results.push({
    question: item.question,
    status: matches.length > 1 ? 'ok-duplicado' : 'ok',
    questaoIds: matches.map((doc) => doc.id),
    imageUrl,
    localPath: tempPath,
    storagePath,
  })

  if (!dryRun) {
    const file = bucket.file(storagePath)
    await bucket.upload(tempPath, {
      destination: storagePath,
      metadata: {
        contentType: downloaded.contentType || 'application/octet-stream',
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    })

    const publicUrl = await getDownloadURL(file)
    const now = new Date().toISOString()

    for (const questaoDoc of matches) {
      const imagensRef = db.collection('questoes').doc(questaoDoc.id).collection('imagens')
      const existing = await imagensRef.get()
      await Promise.all(existing.docs.map((doc) => doc.ref.delete()))

      await imagensRef.add({
        questao_id: questaoDoc.id,
        url: publicUrl,
        ordem: 0,
        created_at: now,
      })

      uploaded++
      matchedDocs++
      console.log(`Atualizada questão ${questaoDoc.id}: ${item.question}`)
    }
  } else {
    matchedDocs += matches.length
  }

  matchedRows++
}

if (dryRun) {
  rmSync(tempRoot, { recursive: true, force: true })
}

console.log('')
console.log(`Perguntas com imagem: ${items.length}`)
console.log(`Linhas encontradas: ${matchedRows}`)
console.log(`Documentos atualizados: ${matchedDocs}`)
console.log(`Falhas: ${missing}`)
if (dryRun) {
  console.log('Modo dry-run: nenhum upload ou escrita foi realizado.')
}
console.log('')
console.log(JSON.stringify(results, null, 2))
if (!dryRun) {
  console.log(`Uploads realizados: ${uploaded}`)
}

process.exit(0)
