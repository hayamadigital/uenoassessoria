import { requestDeletion, processDeletion, retentionInput, validReceipt } from './account-deletion'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import axios from 'axios'
import sanitizeHtml from 'sanitize-html'
import { enforceRateLimit, enforceRateLimitByIp } from './rate-limit'

admin.initializeApp()

const db = getFirestore()
const auth = getAuth()
const storage = getStorage()
const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true'

const CORS = {
  invoker: 'public' as const,
  enforceAppCheck,
  cors: [
    'https://ueno-assessoria.vercel.app',
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
  ],
}

async function assertAdmin(request: CallableRequest) {
  if (request.auth?.token?.role === 'admin') return
  if (!request.auth) throw new HttpsError('unauthenticated', 'Não autenticado')
  throw new HttpsError('permission-denied', 'Apenas admins podem executar esta ação')
}

function assertStaff(request: CallableRequest) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Não autenticado')
  if (!['admin', 'instrutor'].includes(String(request.auth.token.role))) {
    throw new HttpsError('permission-denied', 'Apenas admins e instrutores podem executar esta ação')
  }
}

function requiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} é inválido`)
  }
  return value.trim()
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Auth trigger: set custom claims + create /users doc ────────────

export const onUserCreated = onDocumentCreated(
  { document: 'users/{uid}' },
  async (event) => {
    // This is intentionally empty — user docs are created by createCliente / inviteUser
    // The custom claim is set there directly after user creation
  },
)

// ── selfRegister ───────────────────────────────────────────────────
// Chamado pelo app mobile / página do evento com nome, e-mail e demais dados —
// SEM senha. É público (sem request.auth): cria a conta inteira no servidor via
// Admin SDK (sem senha) e devolve sucesso; o cliente então chama
// sendPasswordResetEmail(auth, email) pra disparar o e-mail que deixa o
// visitante definir a própria senha e, de quebra, confirmar que o e-mail é dele.
// Ver docs/cadastro-evento-especificacao.md — cadastro rápido de leads.

const COMO_CONHECEU_VALUES = ['amigos_indicacao', 'redes_sociais', 'evento', 'outros']
const INTERESSE_SUBOPCAO_VALUES: Record<string, string[]> = {
  transferencia_habilitacao: ['carro', 'moto', 'caminhao'],
  habilitacao_zero: ['curso_intensivo', 'processo_menkyou'],
}
const CANAL_CADASTRO_VALUES = ['mobile_app', 'web']

export const selfRegister = onCall({ ...CORS }, async (request) => {
  await enforceRateLimitByIp(db, request, 'selfRegister', 8)

  const {
    full_name,
    email,
    data_nascimento,
    provincia_jp,
    cidade_jp,
    interesse_categorias,
    interesse_subopcoes,
    como_conheceu,
    canal_cadastro,
  } = request.data as {
    full_name: string
    email: string
    data_nascimento: string
    provincia_jp: string
    cidade_jp: string
    interesse_categorias: string[]
    interesse_subopcoes: string[]
    como_conheceu: string
    canal_cadastro: string
  }

  const normalizedName = requiredString(full_name, 'full_name', 120)
  const normalizedEmail = requiredString(email, 'email', 254).toLowerCase()

  if (!Array.isArray(interesse_categorias) || interesse_categorias.length === 0) {
    throw new HttpsError('invalid-argument', 'interesse_categorias é obrigatório')
  }
  const normalizedCategorias = interesse_categorias.map((c) => requiredString(c, 'interesse_categorias', 60))
  const subopcoesValidas = new Set<string>()
  for (const categoria of normalizedCategorias) {
    const opcoes = INTERESSE_SUBOPCAO_VALUES[categoria]
    if (!opcoes) throw new HttpsError('invalid-argument', 'interesse_categorias contém um valor inválido')
    opcoes.forEach((o) => subopcoesValidas.add(o))
  }

  if (!Array.isArray(interesse_subopcoes) || interesse_subopcoes.length === 0) {
    throw new HttpsError('invalid-argument', 'interesse_subopcoes é obrigatório')
  }
  const normalizedSubopcoes = interesse_subopcoes.map((s) => requiredString(s, 'interesse_subopcoes', 60))
  if (!normalizedSubopcoes.every((s) => subopcoesValidas.has(s))) {
    throw new HttpsError('invalid-argument', 'interesse_subopcoes contém uma opção inválida para as categorias escolhidas')
  }

  const normalizedComoConheceu = requiredString(como_conheceu, 'como_conheceu', 60)
  if (!COMO_CONHECEU_VALUES.includes(normalizedComoConheceu)) {
    throw new HttpsError('invalid-argument', 'como_conheceu é inválido')
  }

  const normalizedCanal = requiredString(canal_cadastro, 'canal_cadastro', 20)
  if (!CANAL_CADASTRO_VALUES.includes(normalizedCanal)) {
    throw new HttpsError('invalid-argument', 'canal_cadastro é inválido')
  }

  let userRecord
  try {
    userRecord = await auth.createUser({
      email: normalizedEmail,
      displayName: normalizedName,
      emailVerified: false,
    })
  } catch (e: any) {
    if (e?.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este e-mail já está cadastrado.')
    }
    throw e
  }

  try {
    await auth.setCustomUserClaims(userRecord.uid, { role: 'cliente' })

    const now = new Date().toISOString()
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      role: 'cliente',
      full_name: normalizedName,
      email: normalizedEmail,
      phone: null,
      whatsapp: null,
      avatar_url: null,
      preferred_lang: 'pt-BR',
      is_active: true,
      endereco_jp: null,
      created_at: now,
      updated_at: now,
    })

    const clienteRef = db.collection('clientes').doc()
    await clienteRef.set({
      id: clienteRef.id,
      profile_id: userRecord.uid,
      data_nascimento: data_nascimento ?? null,
      provincia_jp: provincia_jp ?? null,
      cidade_jp: cidade_jp ?? null,
      status_processo: 'prospect',
      cpf: null,
      endereco_jp: null,
      cep_jp: null,
      data_entrada_japao: null,
      visto_tipo: null,
      observacoes_internas: null,
      observacoes_cliente: null,
      assigned_instrutor_id: null,
      nome_japones: null,
      nacionalidade: 'BR',
      zairyu_card: null,
      visto_validade: null,
      profissao_tipo: null,
      profissao_empresa: null,
      bairro_jp: null,
      numero_bloco_jp: null,
      apartamento_jp: null,
      complemento_jp: null,
      mapa_link_jp: null,
      interesse_categorias: normalizedCategorias,
      interesse_subopcoes: normalizedSubopcoes,
      como_conheceu: normalizedComoConheceu,
      canal_cadastro: normalizedCanal,
      created_at: now,
      updated_at: now,
    })
  } catch (e) {
    // Evita usuário órfão no Auth sem perfil no Firestore.
    await auth.deleteUser(userRecord.uid).catch(() => {})
    throw e
  }

  return { success: true }
})

export const setRoleClaim = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)
  await enforceRateLimit(db, request, 'setRoleClaim', 10)
  const uid = requiredString(request.data?.uid, 'uid', 128)
  const role = request.data?.role
  if (!['admin', 'instrutor', 'cliente'].includes(role)) {
    throw new HttpsError('invalid-argument', 'role inválida')
  }
  if (uid === request.auth!.uid && role !== 'admin') {
    throw new HttpsError('failed-precondition', 'Você não pode remover a própria função de admin')
  }

  const user = await auth.getUser(uid)
  await auth.setCustomUserClaims(uid, { ...user.customClaims, role })
  await db.collection('users').doc(uid).update({ role, updated_at: new Date().toISOString() })
  await auth.revokeRefreshTokens(uid)
  return { success: true }
})

// ── createCliente ──────────────────────────────────────────────────

export const createCliente = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)
  await enforceRateLimit(db, request, 'createCliente', 20)

  const { full_name, email, whatsapp, nacionalidade } = request.data as {
    full_name: string
    email: string
    whatsapp?: string
    nacionalidade?: string
  }

  const normalizedName = requiredString(full_name, 'full_name', 120)
  const normalizedEmail = requiredString(email, 'email', 254).toLowerCase()

  const optionalFields = ['phone', 'visto_tipo', 'cidade_jp', 'endereco_jp', 'cpf', 'data_nascimento', 'observacoes_internas'] as const
  const details: Record<string, string | null> = {}
  for (const field of optionalFields) {
    const value = request.data?.[field]
    if (value != null && (typeof value !== 'string' || value.length > 2000)) {
      throw new HttpsError('invalid-argument', `${field} inválido`)
    }
    details[field] = typeof value === 'string' && value.trim() ? value.trim() : null
  }
  let userId: string | undefined
  let clienteId: string | undefined

  try {
    const userRecord = await auth.createUser({
      email: normalizedEmail,
      displayName: normalizedName,
      emailVerified: true,
    })
    userId = userRecord.uid

    // Set role custom claim
    await auth.setCustomUserClaims(userId, { role: 'cliente' })

    // Create /users/{uid} profile document
    const now = new Date().toISOString()
    await db.collection('users').doc(userId).set({
      id: userId,
      role: 'cliente',
      full_name: normalizedName,
      email: normalizedEmail,
      phone: details.phone,
      whatsapp: whatsapp ?? null,
      avatar_url: null,
      preferred_lang: 'pt-BR',
      is_active: true,
      endereco_jp: details.endereco_jp,
      created_at: now,
      updated_at: now,
    })

    // Create /clientes/{id} document
    const clienteRef = db.collection('clientes').doc()
    clienteId = clienteRef.id
    await clienteRef.set({
      id: clienteRef.id,
      profile_id: userId,
      nacionalidade: nacionalidade ?? null,
      status_processo: 'prospect',
      cpf: details.cpf,
      data_nascimento: details.data_nascimento,
      endereco_jp: details.endereco_jp,
      cidade_jp: details.cidade_jp,
      cep_jp: null,
      data_entrada_japao: null,
      visto_tipo: details.visto_tipo,
      observacoes_internas: details.observacoes_internas,
      observacoes_cliente: null,
      assigned_instrutor_id: null,
      nome_japones: null,
      zairyu_card: null,
      visto_validade: null,
      profissao_tipo: null,
      profissao_empresa: null,
      provincia_jp: null,
      bairro_jp: null,
      numero_bloco_jp: null,
      apartamento_jp: null,
      complemento_jp: null,
      mapa_link_jp: null,
      created_at: now,
      updated_at: now,
    })

    const resetLink = await auth.generatePasswordResetLink(normalizedEmail)

    return { cliente_id: clienteRef.id, user_id: userId, reset_link: resetLink }
  } catch (err) {
    if (userId) {
      await db.collection('users').doc(userId).delete()
      if (clienteId) await db.collection('clientes').doc(clienteId).delete()
      await auth.deleteUser(userId)
    }
    if ((err as { code?: string }).code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'E-mail já cadastrado')
    throw err
  }
})

// ── inviteUser ─────────────────────────────────────────────────────

export const inviteUser = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)
  await enforceRateLimit(db, request, 'inviteUser', 10)

  const { email, full_name, role } = request.data as {
    email: string
    full_name: string
    role: 'admin' | 'instrutor'
  }

  if (!['admin', 'instrutor'].includes(role)) {
    throw new HttpsError('invalid-argument', 'role deve ser admin ou instrutor')
  }
  const normalizedName = requiredString(full_name, 'full_name', 120)
  const normalizedEmail = requiredString(email, 'email', 254).toLowerCase()

  const userRecord = await auth.createUser({
    email: normalizedEmail,
    displayName: normalizedName,
    emailVerified: false,
  })

  await auth.setCustomUserClaims(userRecord.uid, { role })

  const now = new Date().toISOString()
  await db.collection('users').doc(userRecord.uid).set({
    id: userRecord.uid,
    role,
    full_name: normalizedName,
    email: normalizedEmail,
    phone: null,
    whatsapp: null,
    avatar_url: null,
    preferred_lang: 'pt-BR',
    is_active: true,
    endereco_jp: null,
    created_at: now,
    updated_at: now,
  })

  // Generate password reset link to send via email
  const resetLink = await auth.generatePasswordResetLink(normalizedEmail)

  return { user_id: userRecord.uid, reset_link: resetLink }
})

// ── regenerateInviteLink ───────────────────────────────────────────

export const regenerateInviteLink = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)
  await enforceRateLimit(db, request, 'regenerateInviteLink', 5)

  const { email } = request.data as { email: string }
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error('email é obrigatório')
  }

  const userRecord = await auth.getUserByEmail(normalizedEmail)
  const userSnap = await db.collection('users').doc(userRecord.uid).get()

  if (!userSnap.exists) {
    throw new Error('Usuário não encontrado')
  }

  const resetLink = await auth.generatePasswordResetLink(normalizedEmail)

  await userSnap.ref.update({ updated_at: new Date().toISOString() })

  return { user_id: userRecord.uid, email: normalizedEmail, reset_link: resetLink }
})

export const setUserActive = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)
  await enforceRateLimit(db, request, 'setUserActive', 20)

  const uid = requiredString(request.data?.uid, 'uid', 128)
  const isActive = request.data?.is_active
  if (typeof isActive !== 'boolean') {
    throw new HttpsError('invalid-argument', 'is_active deve ser booleano')
  }
  if (uid === request.auth!.uid && !isActive) {
    throw new HttpsError('failed-precondition', 'Você não pode desativar a própria conta')
  }

  const profileRef = db.collection('users').doc(uid)
  const profileSnap = await profileRef.get()
  if (!profileSnap.exists) throw new HttpsError('not-found', 'Usuário não encontrado')

  await auth.updateUser(uid, { disabled: !isActive })
  if (!isActive) await auth.revokeRefreshTokens(uid)
  await profileRef.update({ is_active: isActive, updated_at: new Date().toISOString() })

  return { success: true }
})

// ── generateContractPdf ────────────────────────────────────────────

export const generateContractPdf = onCall({ ...CORS }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Não autenticado')
  // Older test/admin-issued tokens may not carry the claim; Firebase email
  // accounts explicitly report false until verification is completed.
  if (request.auth.token.role === 'cliente' && request.auth.token.email_verified === false) {
    throw new HttpsError('permission-denied', 'Contrato indisponível')
  }
  await enforceRateLimit(db, request, 'generateContractPdf', 5)

  const contratoId = requiredString(request.data?.contrato_id, 'contrato_id', 128)
  const contratoSnap = await db.collection('contratos').doc(contratoId).get()
  if (!contratoSnap.exists) {
    throw new HttpsError('permission-denied', 'Contrato indisponível')
  }

  const contrato = contratoSnap.data()!

  const clienteId = requiredString(contrato.cliente_id, 'cliente_id', 128)
  const clienteSnap = await db.collection('clientes').doc(clienteId).get()
  if (!clienteSnap.exists) throw new HttpsError('permission-denied', 'Contrato indisponível')
  const profileId = clienteSnap.data()?.profile_id as string

  if (request.auth.token.role !== 'admin' && request.auth.uid !== profileId) {
    throw new HttpsError('permission-denied', 'Contrato indisponível')
  }

  if (contrato.status !== 'assinado') {
    throw new HttpsError('failed-precondition', 'Contrato ainda não foi assinado')
  }

  const profileSnap = await db.collection('users').doc(profileId).get()
  const clienteNome = escapeHtml(profileSnap.data()?.full_name ?? 'Cliente')
  const titulo = escapeHtml(contrato.titulo)
  const ipAssinatura = escapeHtml(contrato.ip_assinatura ?? 'N/A')
  const corpoContrato = sanitizeHtml(String(contrato.corpo_html ?? ''), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'span']),
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      '*': ['class'],
    },
    allowedSchemes: ['https', 'mailto'],
    allowProtocolRelative: false,
  })

  let assinaturaBase64 = ''
  if (contrato.assinatura_url) {
    const signaturePath = requiredString(contrato.assinatura_url, 'assinatura_url', 1024)
    if (!signaturePath.startsWith(`assinaturas/${clienteId}/`)) {
      throw new HttpsError('failed-precondition', 'Caminho da assinatura inválido')
    }
    const [buffer] = await storage.bucket().file(signaturePath).download()
    assinaturaBase64 = `data:image/png;base64,${buffer.toString('base64')}`
  }

  const dataAssinatura = contrato.assinado_em
    ? new Date(contrato.assinado_em as string).toLocaleDateString('pt-BR', {
        timeZone: 'Asia/Tokyo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : ''

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 8px; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .contract-body { margin: 24px 0; line-height: 1.6; }
    .signature-section { margin-top: 48px; border-top: 1px solid #ccc; padding-top: 24px; }
    .signature-img { max-width: 300px; border: 1px solid #ccc; padding: 8px; }
    .footer { margin-top: 48px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">UENO ASSESSORIA</div>
    <div>Data: ${dataAssinatura}</div>
  </div>
  <h1>${titulo}</h1>
  <div class="contract-body">${corpoContrato}</div>
  <div class="signature-section">
    <p><strong>Assinado por:</strong> ${clienteNome}</p>
    <p><strong>Data da assinatura:</strong> ${dataAssinatura}</p>
    <p><strong>IP:</strong> ${ipAssinatura}</p>
    ${assinaturaBase64 ? `<img class="signature-img" src="${assinaturaBase64}" alt="Assinatura" />` : ''}
  </div>
  <div class="footer">
    Documento gerado eletronicamente pela plataforma UENO ASSESSORIA. ID: ${contratoId}
  </div>
</body>
</html>`

  const pdfPath = `contratos/${clienteId}/${contratoId}/contrato.html`
  const file = storage.bucket().file(pdfPath)
  await file.save(Buffer.from(htmlContent, 'utf-8'), {
    contentType: 'text/html',
    metadata: { cacheControl: 'private, no-store' },
  })

  await contratoSnap.ref.update({
    pdf_url: pdfPath,
    updated_at: new Date().toISOString(),
  })

  return { success: true, pdf_url: pdfPath }
})

// ── sendNotification ───────────────────────────────────────────────

export const sendNotification = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)
  await enforceRateLimit(db, request, 'sendNotification', 30)

  const { referencia_id, referencia_tipo } = request.data as {
      destinatario_id: string
      titulo: string
      corpo: string
      tipo: string
      referencia_id?: string
      referencia_tipo?: string
  }
  const destinatarioId = requiredString(request.data?.destinatario_id, 'destinatario_id', 128)
  const titulo = requiredString(request.data?.titulo, 'titulo', 120)
  const corpo = requiredString(request.data?.corpo, 'corpo', 1000)
  const tipo = requiredString(request.data?.tipo, 'tipo', 64)

  const recipient = await db.collection('users').doc(destinatarioId).get()
  if (!recipient.exists || recipient.data()?.is_active === false) {
    throw new HttpsError('not-found', 'Destinatário ativo não encontrado')
  }

  const now = new Date().toISOString()
  const notifRef = await db.collection('notificacoes').add({
      destinatario_id: destinatarioId,
      titulo,
      corpo,
      tipo,
      referencia_id: referencia_id ?? null,
      referencia_tipo: referencia_tipo ?? null,
      lida: false,
      lida_em: null,
      push_enviado: false,
      created_at: now,
  })

  const tokensSnap = await db
      .collection('push_tokens')
      .where('profile_id', '==', destinatarioId)
      .get()

    if (!tokensSnap.empty) {
      const messages = tokensSnap.docs.map((d) => ({
        to: d.data().token as string,
        title: titulo,
        body: corpo,
        data: { referencia_id, referencia_tipo, notificacao_id: notifRef.id },
        sound: 'default',
        channelId: tipo,
      }))

      try {
        await axios.post('https://exp.host/--/api/v2/push/send', messages, {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: 10_000,
          maxContentLength: 1_000_000,
        })
        await notifRef.update({ push_enviado: true })
      } catch (pushErr) {
        console.error('Push notification failed', axios.isAxiosError(pushErr) ? pushErr.response?.status : 'unknown')
      }
    }

  return { success: true, id: notifRef.id }
})

// ── otimizarRota ───────────────────────────────────────────────────

export const otimizarRota = onCall({ ...CORS }, async (request) => {
  assertStaff(request)
  await enforceRateLimit(db, request, 'otimizarRota', 10)

  const { paradas } = request.data as {
      ponto_partida: string
      ponto_destino: string
      paradas: Array<{ id: string; endereco: string }>
  }
  const pontoPartida = requiredString(request.data?.ponto_partida, 'ponto_partida', 500)
  const pontoDestino = requiredString(request.data?.ponto_destino, 'ponto_destino', 500)

  if (!Array.isArray(paradas) || paradas.length < 1 || paradas.length > 23) {
    throw new HttpsError('invalid-argument', 'paradas deve conter entre 1 e 23 itens')
  }
  const validParadas = paradas.map((parada, index) => ({
    id: requiredString(parada?.id, `paradas[${index}].id`, 128),
    endereco: requiredString(parada?.endereco, `paradas[${index}].endereco`, 500),
  }))

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new HttpsError('failed-precondition', 'Serviço de rotas temporariamente indisponível')

  const waypoints = validParadas.length === 1
    ? validParadas[0].endereco
    : `optimize:true|${validParadas.map((p) => p.endereco).join('|')}`

  const { data: gmData } = await axios.get(
    'https://maps.googleapis.com/maps/api/directions/json',
    {
      params: { origin: pontoPartida, destination: pontoDestino, waypoints, language: 'ja', key: apiKey },
      timeout: 10_000,
      maxContentLength: 2_000_000,
    },
  )
  if (gmData.status !== 'OK') {
    console.error('Google Maps Directions status:', gmData.status, gmData.error_message)
    throw new HttpsError('internal', 'Não foi possível calcular a rota')
  }

    const route = gmData.routes[0]
    const legs: Array<{ distance: { value: number }; duration: { value: number } }> = route.legs
    const waypointOrder: number[] = route.waypoint_order ?? []

  const ordemOtimizada = validParadas.length === 1
    ? [validParadas[0].id]
    : waypointOrder.map((i) => validParadas[i].id)

    const trechoKm = legs.slice(1).map((l) => Math.round((l.distance.value / 1000) * 10) / 10)
    const trechoMin = legs.slice(1).map((l) => Math.round(l.duration.value / 60))
    const totalKm = Math.round([...legs].reduce((a, l) => a + l.distance.value / 1000, 0) * 10) / 10
    const totalMin = [...legs].reduce((a, l) => a + Math.round(l.duration.value / 60), 0)

  return { ordem_otimizada: ordemOtimizada, trecho_km: trechoKm, trecho_min: trechoMin, total_km: totalKm, total_min: totalMin }
})

// Direct profile reads are restricted to admins and the profile owner.
// Instructors resolve assigned clients here because Rules cannot query a reverse relation.
export const getAssignedClientProfile = onCall({ ...CORS }, async (request) => {
  assertStaff(request)
  await enforceRateLimit(db, request, 'getAssignedClientProfile', 300)
  const uid = requiredString(request.data?.uid, 'uid', 128)
  if (request.auth!.token.role !== 'admin') {
    const clients = await db.collection('clientes').where('profile_id', '==', uid).get()
    if (!clients.docs.some((client) => client.data().assigned_instrutor_id === request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'Perfil indisponível')
    }
  }
  const profile = await db.collection('users').doc(uid).get()
  if (!profile.exists || profile.data()?.role !== 'cliente') {
    throw new HttpsError('permission-denied', 'Perfil indisponível')
  }
  return { ...profile.data(), id: profile.id }
})

// Account deletion: users initiate in-app; staff complete after checking retention.
export const requestAccountDeletion = onCall({ ...CORS }, async request => {
  await enforceRateLimit(db, request, 'requestAccountDeletion', 5)
  return requestDeletion(db, request)
})

export const getAccountDeletionReceipt = onCall({ ...CORS, maxInstances: 5 }, async request => {
  const id = requiredString(request.data?.id, 'id', 128)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new HttpsError('invalid-argument', 'Protocolo inválido')
  const snap = await db.collection('account_deletions').doc(id).get()
  if (!snap.exists || !validReceipt(request.data?.receipt, snap.data()?.receipt_hash)) {
    throw new HttpsError('not-found', 'Protocolo não encontrado')
  }
  return { status: snap.data()!.status, requested_at: snap.data()!.requested_at ?? null,
    completed_at: snap.data()!.completed_at ?? null, retention: snap.data()!.retention ?? null }
})

export const completeAccountDeletion = onCall({ ...CORS, timeoutSeconds: 540, memory: '512MiB' }, async request => {
  await assertAdmin(request)
  await enforceRateLimit(db, request, 'completeAccountDeletion', 5)
  const uid = requiredString(request.data?.uid, 'uid', 128)
  if (!/^[a-zA-Z0-9_-]+$/.test(uid)) throw new HttpsError('invalid-argument', 'UID inválido')
  if (request.data?.confirmation !== 'EXCLUIR') throw new HttpsError('invalid-argument', 'Confirme a exclusão')
  if (uid === request.auth!.uid) throw new HttpsError('failed-precondition', 'Outro administrador deve concluir sua solicitação.')
  const retention = retentionInput(request.data)
  const ref = db.collection('account_deletions').doc(uid)
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new HttpsError('not-found', 'Solicitação não encontrada')
    if (snap.data()?.status === 'completed') return
    if (Number(snap.data()?.lease_until ?? 0) > Date.now()) throw new HttpsError('aborted', 'Exclusão em andamento. Aguarde.')
    tx.update(ref, { status: 'processing', lease_until: Date.now() + 600_000,
      retention: snap.data()?.status === 'processing' ? snap.data()?.retention ?? null : retention })
  })
  try { await processDeletion(db, auth, storage, uid, retention) }
  catch (error) { await ref.update({ lease_until: 0 }); throw error }
  return { success: true }
})

export const purgeExpiredRetainedAccounts = onSchedule('every 24 hours', async () => {
  const expired = await db.collection('_retained_accounts').where('expires_at', '<=', new Date().toISOString()).get()
  for (const account of expired.docs) {
    await storage.bucket().deleteFiles({ prefix: `retained-accounts/${account.id}/` })
    await db.recursiveDelete(account.ref)
  }
})
