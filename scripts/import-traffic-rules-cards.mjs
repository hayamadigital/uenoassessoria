import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/index.js'))

const SOURCE_URL = 'https://traffic-rules.com/pt-jp/livro/traffic-signs'
const apply = process.argv.includes('--apply')

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

function decodeHtml(text) {
  return String(text ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 16)))
}

function stripTags(text) {
  return decodeHtml(text).replace(/<[^>]+>/g, ' ')
}

function cleanText(text) {
  return stripTags(text).replace(/\s+/g, ' ').trim()
}

function cleanTitle(text) {
  return cleanText(text).replace(/^\d+\.\s*/, '')
}

function absoluteUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return new URL(path.replace(':country', 'jp'), SOURCE_URL).toString()
}

function parseCards(html) {
  const blocks = html.split('<div class="panel panel-info printCenter"').slice(1)
  return blocks
    .map((block, index) => {
      const title = cleanTitle(block.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ?? '')
      const descricao = cleanText(block.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '')
      const image = block.match(/<img src="([^"]+)"[^>]*id="([^"]+)-img"/)
      const fallbackImage = block.match(/<img src="([^"]+)"[^>]*class="img-responsive center-block"/)
      const imagePath = image?.[1] ?? fallbackImage?.[1] ?? ''
      const id = image?.[2] ?? imagePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? `card-${index}`
      const credit = cleanText(block.match(new RegExp(`<span id="${id}-span"[\\s\\S]*?>([\\s\\S]*?)<\\/span>`))?.[1] ?? '')
      const categories = [...block.matchAll(/href="\/pt-jp\/livro\/[^"]+"[^>]*>([^<]+)<\/a>/g)]
        .map((m) => cleanText(m[1]))
        .filter((name) => name && name !== 'Recreio')

      if (!title || !imagePath) return null
      return {
        id,
        titulo: title,
        descricao,
        imagem_url: absoluteUrl(imagePath),
        credito_imagem: credit || null,
        categorias: Array.from(new Set(categories)),
        ordem: index,
      }
    })
    .filter(Boolean)
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36',
    },
  })
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: ${response.status}`)
  return response.text()
}

async function findOrCreateCategoria(nome) {
  const snap = await db.collection('categorias_material').where('nome', '==', nome).limit(1).get()
  if (!snap.empty) return snap.docs[0].ref
  return db.collection('categorias_material').add({
    nome,
    descricao: 'Flashcards de sinalização de trânsito',
    ordem: 0,
    created_at: new Date().toISOString(),
  })
}

async function findOrCreateMaterial(categoriaRef) {
  const titulo = 'Flashcards de sinalização de trânsito - Japão'
  const snap = await db.collection('materiais').where('titulo', '==', titulo).limit(1).get()
  const now = new Date().toISOString()
  if (!snap.empty) return snap.docs[0].ref
  return db.collection('materiais').add({
    titulo,
    descricao: 'Conjunto de cards baseado no livro de sinalização de trânsito do Japão.',
    tipo: 'card',
    url: null,
    thumbnail_url: null,
    conteudo_texto: null,
    banner_url: null,
    album_urls: [],
    categoria_id: categoriaRef.id,
    is_public: false,
    is_active: true,
    ordem: 0,
    duracao_min: null,
    tamanho_bytes: null,
    publicado_por: null,
    created_at: now,
    updated_at: now,
  })
}

const html = await fetchHtml(SOURCE_URL)
const cards = parseCards(html)

console.log(`Encontrados ${cards.length} cards em ${SOURCE_URL}`)
console.log(JSON.stringify(cards.slice(0, 5), null, 2))

if (!apply) {
  console.log('Pré-visualização apenas. Rode com --apply para gravar no Firestore.')
  process.exit(0)
}

const categoriaRef = await findOrCreateCategoria('Sinalização de trânsito')
const materialRef = await findOrCreateMaterial(categoriaRef)
const existingSnap = await materialRef.collection('cards').get()
const existingBySource = new Map(existingSnap.docs.map((d) => [d.data().fonte_url, d.ref]))
const now = new Date().toISOString()

let created = 0
let updated = 0
for (const card of cards) {
  const data = {
        material_id: materialRef.id,
        imagem_url: card.imagem_url,
        legenda_pt: card.titulo,
        categoria: card.categorias.join('; ') || null,
        legenda_kanji: null,
    legenda_hiragana: null,
    legenda_romaji: null,
    descricao: card.descricao || null,
    credito_imagem: card.credito_imagem,
    fonte_url: `${SOURCE_URL}#${card.id}`,
    ordem: card.ordem,
    updated_at: now,
  }
  const existingRef = existingBySource.get(data.fonte_url)
  if (existingRef) {
    await existingRef.update(data)
    updated++
  } else {
    await materialRef.collection('cards').add({ ...data, created_at: now })
    created++
  }
}

console.log(JSON.stringify({ materialId: materialRef.id, created, updated }, null, 2))
process.exit(0)
