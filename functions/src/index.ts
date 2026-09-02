import * as admin from 'firebase-admin'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import axios from 'axios'
import sanitizeHtml from 'sanitize-html'

admin.initializeApp()

const db = getFirestore()
const auth = getAuth()
const storage = getStorage()

const CORS = {
  invoker: 'public' as const,
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
// Called by the mobile app immediately after createUserWithEmailAndPassword.
// Uses admin SDK to bypass Firestore rules, sets role claim, creates profile + cliente.

export const selfRegister = onCall({ ...CORS }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Não autenticado')

  const uid = request.auth.uid
  const { full_name, email, data_nascimento, provincia_jp, cidade_jp } = request.data as {
    full_name: string
    email: string
    data_nascimento: string
    provincia_jp: string
    cidade_jp: string
  }

  const normalizedName = requiredString(full_name, 'full_name', 120)
  const normalizedEmail = requiredString(email, 'email', 254).toLowerCase()
  if (normalizedEmail !== String(request.auth.token.email ?? '').toLowerCase()) {
    throw new HttpsError('permission-denied', 'O email deve corresponder ao usuário autenticado')
  }

  // Prevent overwriting an existing profile (e.g. invited user trying to re-register)
  const existingSnap = await db.collection('users').doc(uid).get()
  if (existingSnap.exists) throw new HttpsError('already-exists', 'Perfil já existe para este usuário')

  await auth.setCustomUserClaims(uid, { role: 'cliente' })

  const now = new Date().toISOString()
  await db.collection('users').doc(uid).set({
    id: uid,
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
    profile_id: uid,
    data_nascimento: data_nascimento ?? null,
    provincia_jp: provincia_jp ?? null,
    cidade_jp: cidade_jp ?? null,
    status_processo: 'prospect',
    cpf: null,
    endereco_jp: null,
    cep_jp: null,
    cnh_numero: null,
    cnh_categoria: null,
    cnh_validade: null,
    cnh_estado_emissor: null,
    data_entrada_japao: null,
    visto_tipo: null,
    observacoes: null,
    assigned_instrutor_id: null,
    nome_japones: null,
    nacionalidade: 'brasileira',
    zairyu_card: null,
    visto_validade: null,
    profissao_tipo: null,
    profissao_empresa: null,
    bairro_jp: null,
    numero_bloco_jp: null,
    apartamento_jp: null,
    complemento_jp: null,
    mapa_link_jp: null,
    created_at: now,
    updated_at: now,
  })

  return { success: true }
})

export const setRoleClaim = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)
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

  const { full_name, email, whatsapp, nacionalidade } = request.data as {
    full_name: string
    email: string
    whatsapp?: string
    nacionalidade?: string
  }

  const normalizedName = requiredString(full_name, 'full_name', 120)
  const normalizedEmail = requiredString(email, 'email', 254).toLowerCase()

  let userId: string | undefined

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
      phone: null,
      whatsapp: whatsapp ?? null,
      avatar_url: null,
      preferred_lang: 'pt-BR',
      is_active: true,
      endereco_jp: null,
      created_at: now,
      updated_at: now,
    })

    // Create /clientes/{id} document
    const clienteRef = db.collection('clientes').doc()
    await clienteRef.set({
      id: clienteRef.id,
      profile_id: userId,
      nacionalidade: nacionalidade ?? null,
      status_processo: 'prospect',
      cpf: null,
      data_nascimento: null,
      endereco_jp: null,
      cidade_jp: null,
      cep_jp: null,
      cnh_numero: null,
      cnh_categoria: null,
      cnh_validade: null,
      cnh_estado_emissor: null,
      data_entrada_japao: null,
      visto_tipo: null,
      observacoes: null,
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
      await auth.deleteUser(userId).catch(() => undefined)
    }
    throw err
  }
})

// ── inviteUser ─────────────────────────────────────────────────────

export const inviteUser = onCall({ ...CORS }, async (request) => {
  await assertAdmin(request)

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

  const contratoId = requiredString(request.data?.contrato_id, 'contrato_id', 128)
  const contratoSnap = await db.collection('contratos').doc(contratoId).get()
  if (!contratoSnap.exists) {
    throw new HttpsError('not-found', 'Contrato não encontrado')
  }

  const contrato = contratoSnap.data()!
  if (contrato.status !== 'assinado') {
    throw new HttpsError('failed-precondition', 'Contrato ainda não foi assinado')
  }

  const clienteId = requiredString(contrato.cliente_id, 'cliente_id', 128)
  const clienteSnap = await db.collection('clientes').doc(clienteId).get()
  if (!clienteSnap.exists) throw new HttpsError('not-found', 'Cliente não encontrado')
  const profileId = clienteSnap.data()?.profile_id as string

  if (request.auth.token.role !== 'admin' && request.auth.uid !== profileId) {
    throw new HttpsError('permission-denied', 'Você não tem acesso a este contrato')
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
        console.error('Push notification error:', pushErr)
      }
    }

  return { success: true, id: notifRef.id }
})

// ── otimizarRota ───────────────────────────────────────────────────

export const otimizarRota = onCall({ ...CORS }, async (request) => {
  assertStaff(request)

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
  if (!apiKey) throw new HttpsError('failed-precondition', 'GOOGLE_MAPS_API_KEY não configurada')

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
