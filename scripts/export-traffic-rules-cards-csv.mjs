import { mkdir, writeFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const START_URL = 'https://traffic-rules.com/pt-jp/livro/traffic-signs'
const OVERVIEW_URL = 'https://traffic-rules.com/pt-jp/livro/traffic-signs-2'
const missingOnly = process.argv.includes('--missing-only')
const OUTPUT_PATH = missingOnly
  ? resolve(__dirname, '../imports/traffic-rules-jp-cards-faltantes.csv')
  : resolve(__dirname, '../imports/traffic-rules-jp-cards.csv')

const CSV_HEADERS = [
  'imagem_url',
  'legenda_pt',
  'categoria',
  'legenda_kanji',
  'legenda_hiragana',
  'legenda_romaji',
  'descricao',
  'credito_imagem',
  'fonte_url',
  'ordem',
]

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
  return cleanText(text).replace(/^\d+\.\s*/, '').replace(/\.$/, '')
}

function absoluteUrl(path, baseUrl = START_URL) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return new URL(path.replace(':country', 'jp'), baseUrl).toString()
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function attrValue(tag, attr) {
  return tag.match(new RegExp(`${attr}="([^"]*)"`))?.[1] ?? ''
}

function cardKey(card) {
  return (
    card.fonte_url.split('#')[1]
    || decodeURIComponent(card.imagem_url.split('/').pop() ?? '').replace(/\.[^.]+$/, '')
  ).toLowerCase()
}

function parseCards(html, pageUrl, initialOrder) {
  const blocks = html.split('<div class="panel panel-info printCenter"').slice(1)
  let order = initialOrder

  return blocks
    .map((block) => {
      const title = cleanTitle(block.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ?? '')
      const descricao = cleanText(block.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '')
      const image = block.match(/<img src="([^"]+)"[^>]*id="([^"]+)-img"/)
      const fallbackImage = block.match(/<img src="([^"]+)"[^>]*class="img-responsive center-block"/)
      const imagePath = image?.[1] ?? fallbackImage?.[1] ?? ''
      const id = image?.[2] ?? imagePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? `card-${order}`
      const credit = cleanText(
        block.match(new RegExp(`<span id="${id}-span"[\\s\\S]*?>([\\s\\S]*?)<\\/span>`))?.[1] ?? '',
      )
      const categories = [...block.matchAll(/href="\/pt-jp\/livro\/[^"]+"[^>]*>([^<]+)<\/a>/g)]
        .map((match) => cleanText(match[1]))
        .filter((name) => name && name !== 'Recreio')

      if (!title || !imagePath) return null

      const card = {
        imagem_url: absoluteUrl(imagePath, pageUrl),
        legenda_pt: title,
        categoria: Array.from(new Set(categories)).join('; '),
        legenda_kanji: '',
        legenda_hiragana: '',
        legenda_romaji: '',
        descricao,
        credito_imagem: credit,
        fonte_url: `${pageUrl}#${id}`,
        ordem: order,
      }
      order += 1
      return card
    })
    .filter(Boolean)
}

function parseOverviewCards(html, pageUrl, initialOrder) {
  const panels = html.split('<div class="panel panel-info pageBreak"').slice(1)
  let order = initialOrder

  return panels.flatMap((panel) => {
    const section = cleanTitle(panel.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ?? '')
      .replace(/^Placas?\s+de\s+/i, '')
      .replace(/^Sinalização\s+/i, '')
    const rows = panel.split('<div class="row">').slice(1)

    return rows
      .map((row) => {
        const tag = row.match(/<img\b[^>]*id="[^"]+-img"[^>]*>/)?.[0] ?? ''
        const caption = row.match(/<div class="col-xs-9 col-md-10"[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1] ?? ''
        const title = cleanTitle(attrValue(tag, 'title') || caption)
        const imagePath = attrValue(tag, 'src')
        const id = attrValue(tag, 'id').replace(/-img$/, '')

        if (!title || !imagePath || !id) return null

        const card = {
          imagem_url: absoluteUrl(imagePath, pageUrl),
          legenda_pt: title,
          categoria: section,
          legenda_kanji: '',
          legenda_hiragana: '',
          legenda_romaji: '',
          descricao: title,
          credito_imagem: '',
          fonte_url: `${pageUrl}#${id}`,
          ordem: order,
        }
        order += 1
        return card
      })
      .filter(Boolean)
  })
}

function parseMoreUrls(html, pageUrl) {
  return [...html.matchAll(/href="([^"]*\/pt-jp\/livro\/traffic-signs-\d+)"/g)]
    .map((match) => absoluteUrl(match[1], pageUrl))
    .filter((url, index, all) => all.indexOf(url) === index)
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

async function collectAllCards() {
  const pending = [START_URL]
  const visited = new Set()
  const cards = []
  const byKey = new Map()

  while (pending.length > 0) {
    const pageUrl = pending.shift()
    if (!pageUrl || visited.has(pageUrl)) continue
    visited.add(pageUrl)

    const html = await fetchHtml(pageUrl)
    for (const card of parseCards(html, pageUrl, cards.length)) {
      const key = cardKey(card)
      if (!byKey.has(key)) {
        byKey.set(key, card)
        cards.push(card)
      }
    }

    for (const url of parseMoreUrls(html, pageUrl)) {
      if (!visited.has(url) && !pending.includes(url)) pending.push(url)
    }
  }

  const overviewHtml = await fetchHtml(OVERVIEW_URL)
  visited.add(OVERVIEW_URL)
  const overviewCards = parseOverviewCards(overviewHtml, OVERVIEW_URL, cards.length)

  if (missingOnly) {
    const missing = []
    const missingKeys = new Set()
    for (const card of overviewCards) {
      const key = cardKey(card)
      if (byKey.has(key) || missingKeys.has(key)) continue
      missingKeys.add(key)
      missing.push({ ...card, ordem: missing.length })
    }
    return {
      cards: missing,
      pages: Array.from(visited),
    }
  }

  for (const card of overviewCards) {
    const key = cardKey(card)
    if (!byKey.has(key)) {
      byKey.set(key, card)
      cards.push({ ...card, ordem: cards.length })
    }
  }

  return { cards, pages: Array.from(visited) }
}

const { cards, pages } = await collectAllCards()
const csv = [
  CSV_HEADERS.join(','),
  ...cards.map((card) => CSV_HEADERS.map((header) => csvEscape(card[header])).join(',')),
].join('\n')

await mkdir(dirname(OUTPUT_PATH), { recursive: true })
await writeFile(OUTPUT_PATH, `${csv}\n`, 'utf8')

const categorias = Array.from(
  new Set(cards.flatMap((card) => card.categoria.split(';').map((name) => name.trim()).filter(Boolean))),
).sort((a, b) => a.localeCompare(b, 'pt-BR'))

console.log(JSON.stringify({
  output: OUTPUT_PATH,
  pages: pages.length,
  cards: cards.length,
  categorias,
}, null, 2))
