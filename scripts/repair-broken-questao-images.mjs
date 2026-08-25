import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/index.js'))
const { getDownloadURL } = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/storage/index.js'))

const serviceAccountPath = resolve(__dirname, '../service-account.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
})

const db = admin.firestore()
const bucket = admin.storage().bucket()

function decodeHtmlEntities(text) {
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

function cleanText(text) {
  return decodeHtmlEntities(text)
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeText(text) {
  return cleanText(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/^\s*\d+\s*[.)-]?\s*/, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function contentTypeToExt(contentType) {
  const type = String(contentType ?? '').split(';')[0].trim().toLowerCase()
  switch (type) {
    case 'image/svg+xml':
      return 'svg'
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    default:
      return 'bin'
  }
}

async function download(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      ...extraHeaders,
    },
  })
  if (!response.ok) {
    throw new Error(`Falha ao baixar ${url}: ${response.status}`)
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
  }
}

async function replaceQuestionImage(questionId, buffer, contentType, fileName) {
  const ext = contentTypeToExt(contentType)
  const storagePath = `imagens/questoes/${questionId}/${fileName}.${ext === 'bin' ? 'jpg' : ext}`
  const token = crypto.randomUUID()
  const file = bucket.file(storagePath)

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  })

  const url = await getDownloadURL(file)
  const imagensRef = db.collection('questoes').doc(questionId).collection('imagens')
  const existing = await imagensRef.get()

  if (existing.empty) {
    await imagensRef.add({
      questao_id: questionId,
      url,
      ordem: 0,
      created_at: new Date().toISOString(),
    })
  } else {
    await Promise.all(existing.docs.map((docSnap) => docSnap.ref.update({ questao_id: questionId, url })))
  }

  return { questionId, storagePath, url }
}

async function repairBuzinarQuestion() {
  const formUrl =
    'https://docs.google.com/forms/d/e/1FAIpQLSdvSnooLKAE-Qq4ZitAvBQ3zZ7hrwrtl9h8aSAhYO6uzZitiA/viewform?hr_submission=ChkIjL6T0r0YEhAImcaF2KATEgcI9PPk16ATEAA'
  const targetText =
    'Nos lugares com esta placa, deve-se buzinar primeiro para depois transitar pois existe um cruzamento.'
  const html = await (await fetch(formUrl, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  })).text()

  const blocks = [...html.matchAll(/<div class=\"Qr7Oae\" role=\"listitem\">([\s\S]*?)<\/div><\/div><\/div><\/div>/g)]
  let imageUrl = null
  let question = null

  for (const match of blocks) {
    const full = match[0]
    const paramsMatch = full.match(/data-params=\"%\.\@\.\[(?:-?\d+),&quot;([\s\S]*?)&quot;/)
    const text = cleanText(paramsMatch?.[1] ?? '')
    const img = [...full.matchAll(/<img[^>]*src=\"([^\"]+)\"[^>]*>/g)][0]?.[1]
    if (img && normalizeText(text) === normalizeText(targetText)) {
      imageUrl = img
      question = text
      break
    }
  }

  if (!imageUrl) {
    throw new Error('Imagem da questão de buzinar não encontrada no formulário.')
  }

  const downloaded = await download(imageUrl, { referer: 'https://docs.google.com/' })
  return replaceQuestionImage(
    '89aN8bWqa87sQ0pdBQ9t',
    downloaded.buffer,
    downloaded.contentType,
    'form-05',
  ).then((result) => ({ ...result, question }))
}

function wikimediaFileName(thumbUrl) {
  const parsed = new URL(thumbUrl)
  const parts = parsed.pathname.split('/').filter(Boolean)
  const thumbIndex = parts.indexOf('thumb')
  if (thumbIndex === -1 || parts.length < thumbIndex + 4) return parts.at(-1)
  return parts[thumbIndex + 3]
}

async function resolveWikimediaOriginalUrl(thumbUrl) {
  const fileName = wikimediaFileName(thumbUrl)
  const apiUrl = new URL('https://commons.wikimedia.org/w/api.php')
  apiUrl.searchParams.set('action', 'query')
  apiUrl.searchParams.set('titles', `File:${fileName}`)
  apiUrl.searchParams.set('prop', 'imageinfo')
  apiUrl.searchParams.set('iiprop', 'url')
  apiUrl.searchParams.set('format', 'json')

  const response = await fetch(apiUrl, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  })
  if (!response.ok) {
    throw new Error(`Falha ao consultar Wikimedia API para ${fileName}: ${response.status}`)
  }

  const payload = await response.json()
  const pages = payload?.query?.pages ?? {}
  const imageInfo = Object.values(pages)[0]?.imageinfo?.[0]
  if (!imageInfo?.url) {
    throw new Error(`URL original da Wikimedia não encontrada para ${fileName}.`)
  }
  return imageInfo.url
}

async function repairWikimediaImages() {
  const items = [
    {
      questionId: '4gIVBOYOeKtfOpjPoVGj',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Japan_road_sign_210.svg/200px-Japan_road_sign_210.svg.png',
    },
    {
      questionId: 'Aa0A0WLp8hh0Lsvf9pA1',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Japan_road_sign_325.svg/200px-Japan_road_sign_325.svg.png',
    },
    {
      questionId: 'GrFQrYscR3r0YrBC2Ttz',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Japan_road_sign_414.svg/200px-Japan_road_sign_414.svg.png',
    },
    {
      questionId: 'IuX0yiqmsPktX04kgs99',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Japan_road_sign_207-2.svg/200px-Japan_road_sign_207-2.svg.png',
    },
    {
      questionId: 'SfRIuy9bYOI7lQOgVXgU',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Japan_road_sign_539.svg/200px-Japan_road_sign_539.svg.png',
    },
    {
      questionId: 'ennQRTgkbcATFaaay5Hl',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Police_traffic_control_front.svg/200px-Police_traffic_control_front.svg.png',
    },
    {
      questionId: 'htAI79rFbg2jdTmKgmIM',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Japan_road_sign_210.svg/200px-Japan_road_sign_210.svg.png',
    },
  ]

  const results = []
  for (const item of items) {
    try {
      const originalUrl = await resolveWikimediaOriginalUrl(item.url)
      const downloaded = await download(originalUrl)
      results.push(await replaceQuestionImage(item.questionId, downloaded.buffer, downloaded.contentType, 'wikimedia'))
    } catch (error) {
      results.push({
        questionId: item.questionId,
        status: 'kept_broken_external_image',
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return results
}

const results = {
  buzinar: await repairBuzinarQuestion(),
  wikimedia: await repairWikimediaImages(),
}

console.log(JSON.stringify(results, null, 2))
process.exit(0)
