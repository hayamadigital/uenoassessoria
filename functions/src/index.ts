import * as admin from 'firebase-admin'
import { onRequest, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import axios from 'axios'

admin.initializeApp()

const db = getFirestore()
const auth = getAuth()
const storage = getStorage()

const CORS = { cors: ['*'] }

async function assertAdmin(request: CallableRequest) {
  if (request.auth?.token?.role === 'admin') return

  const uid = request.auth?.uid
  if (!uid) throw new Error('Não autenticado')

  const profileSnap = await db.collection('users').doc(uid).get()
  if (profileSnap.data()?.role !== 'admin') {
    throw new Error('Apenas admins podem executar esta ação')
  }
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
  if (!request.auth) throw new Error('Não autenticado')

  const uid = request.auth.uid
  const { full_name, email, data_nascimento, provincia_jp, cidade_jp } = request.data as {
    full_name: string
    email: string
    data_nascimento: string
    provincia_jp: string
    cidade_jp: string
  }

  if (!full_name || !email) throw new Error('full_name e email são obrigatórios')

  // Prevent overwriting an existing profile (e.g. invited user trying to re-register)
  const existingSnap = await db.collection('users').doc(uid).get()
  if (existingSnap.exists) throw new Error('Perfil já existe para este usuário')

  await auth.setCustomUserClaims(uid, { role: 'cliente' })

  const now = new Date().toISOString()
  await db.collection('users').doc(uid).set({
    id: uid,
    role: 'cliente',
    full_name,
    email,
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
  // Admin-only: set a user's role custom claim
  if (!request.auth?.token?.role || request.auth.token.role !== 'admin') {
    throw new Error('Apenas admins podem alterar roles')
  }
  const { uid, role } = request.data as { uid: string; role: string }
  await auth.setCustomUserClaims(uid, { role })
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

  if (!full_name || !email) {
    throw new Error('full_name e email são obrigatórios')
  }

  const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
  let userId: string | undefined

  try {
    const userRecord = await auth.createUser({
      email,
      password: tempPassword,
      displayName: full_name,
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
      full_name,
      email,
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

    const resetLink = await auth.generatePasswordResetLink(email)

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
  if (!request.auth?.token?.role || request.auth.token.role !== 'admin') {
    throw new Error('Apenas admins podem convidar usuários')
  }

  const { email, full_name, role } = request.data as {
    email: string
    full_name: string
    role: 'admin' | 'instrutor'
  }

  if (!email || !full_name || !role) {
    throw new Error('email, full_name e role são obrigatórios')
  }

  const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
  const userRecord = await auth.createUser({
    email,
    password: tempPassword,
    displayName: full_name,
    emailVerified: false,
  })

  await auth.setCustomUserClaims(userRecord.uid, { role })

  const now = new Date().toISOString()
  await db.collection('users').doc(userRecord.uid).set({
    id: userRecord.uid,
    role,
    full_name,
    email,
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
  const resetLink = await auth.generatePasswordResetLink(email)

  return { user_id: userRecord.uid, reset_link: resetLink }
})

// ── generateContractPdf ────────────────────────────────────────────

export const generateContractPdf = onRequest({ ...CORS }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  try {
    const { contrato_id } = req.body as { contrato_id: string }
    if (!contrato_id) {
      res.status(400).json({ error: 'contrato_id é obrigatório' })
      return
    }

    const contratoSnap = await db.collection('contratos').doc(contrato_id).get()
    if (!contratoSnap.exists) {
      res.status(404).json({ error: 'Contrato não encontrado' })
      return
    }

    const contrato = contratoSnap.data()!
    if (contrato.status !== 'assinado') {
      res.status(400).json({ error: 'Contrato ainda não foi assinado' })
      return
    }

    // Fetch client name
    const clienteSnap = await db.collection('clientes').doc(contrato.cliente_id as string).get()
    const profileId = clienteSnap.data()?.profile_id as string
    const profileSnap = await db.collection('users').doc(profileId).get()
    const clienteNome = (profileSnap.data()?.full_name as string) ?? 'Cliente'

    let assinaturaBase64 = ''
    if (contrato.assinatura_url) {
      const bucket = storage.bucket()
      const file = bucket.file(contrato.assinatura_url as string)
      const [buffer] = await file.download()
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
  <h1>${contrato.titulo as string}</h1>
  <div class="contract-body">${contrato.corpo_html as string}</div>
  <div class="signature-section">
    <p><strong>Assinado por:</strong> ${clienteNome}</p>
    <p><strong>Data da assinatura:</strong> ${dataAssinatura}</p>
    <p><strong>IP:</strong> ${(contrato.ip_assinatura as string) ?? 'N/A'}</p>
    ${assinaturaBase64 ? `<img class="signature-img" src="${assinaturaBase64}" alt="Assinatura" />` : ''}
  </div>
  <div class="footer">
    Documento gerado eletronicamente pela plataforma UENO ASSESSORIA. ID: ${contrato_id}
  </div>
</body>
</html>`

    const pdfPath = `contratos/${contrato.cliente_id as string}/${contrato_id}/contrato.html`
    const bucket = storage.bucket()
    const file = bucket.file(pdfPath)
    await file.save(Buffer.from(htmlContent, 'utf-8'), { contentType: 'text/html' })

    await db.collection('contratos').doc(contrato_id).update({
      pdf_url: pdfPath,
      updated_at: new Date().toISOString(),
    })

    res.json({ success: true, pdf_url: pdfPath })
  } catch (err) {
    console.error('generateContractPdf error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── sendNotification ───────────────────────────────────────────────

export const sendNotification = onRequest({ ...CORS }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  try {
    const { destinatario_id, titulo, corpo, tipo, referencia_id, referencia_tipo } = req.body as {
      destinatario_id: string
      titulo: string
      corpo: string
      tipo: string
      referencia_id?: string
      referencia_tipo?: string
    }

    const now = new Date().toISOString()
    const notifRef = await db.collection('notificacoes').add({
      destinatario_id,
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
      .where('profile_id', '==', destinatario_id)
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
        })
        await notifRef.update({ push_enviado: true })
      } catch (pushErr) {
        console.error('Push notification error:', pushErr)
      }
    }

    res.json({ success: true, id: notifRef.id })
  } catch (err) {
    console.error('sendNotification error:', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── otimizarRota ───────────────────────────────────────────────────

export const otimizarRota = onRequest({ ...CORS }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  try {
    const { ponto_partida, ponto_destino, paradas } = req.body as {
      ponto_partida: string
      ponto_destino: string
      paradas: Array<{ id: string; endereco: string }>
    }

    if (!ponto_partida || !ponto_destino || !paradas?.length) {
      res.status(400).json({ error: 'ponto_partida, ponto_destino e paradas são obrigatórios' })
      return
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY não configurada')

    const enc = (s: string) => encodeURIComponent(s)
    let url: string

    if (paradas.length === 1) {
      url = `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${enc(ponto_partida)}&destination=${enc(ponto_destino)}` +
        `&waypoints=${enc(paradas[0].endereco)}&language=ja&key=${apiKey}`
    } else {
      const intermediarios = paradas.map((p) => enc(p.endereco)).join('|')
      url = `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${enc(ponto_partida)}&destination=${enc(ponto_destino)}` +
        `&waypoints=optimize:true|${intermediarios}&language=ja&key=${apiKey}`
    }

    const { data: gmData } = await axios.get(url)
    if (gmData.status !== 'OK') throw new Error(`Google Maps status: ${gmData.status as string}`)

    const route = gmData.routes[0]
    const legs: Array<{ distance: { value: number }; duration: { value: number } }> = route.legs
    const waypointOrder: number[] = route.waypoint_order ?? []

    const ordemOtimizada = paradas.length === 1
      ? [paradas[0].id]
      : waypointOrder.map((i) => paradas[i].id)

    const trechoKm = legs.slice(1).map((l) => Math.round((l.distance.value / 1000) * 10) / 10)
    const trechoMin = legs.slice(1).map((l) => Math.round(l.duration.value / 60))
    const totalKm = Math.round([...legs].reduce((a, l) => a + l.distance.value / 1000, 0) * 10) / 10
    const totalMin = [...legs].reduce((a, l) => a + Math.round(l.duration.value / 60), 0)

    res.json({ ordem_otimizada: ordemOtimizada, trecho_km: trechoKm, trecho_min: trechoMin, total_km: totalKm, total_min: totalMin })
  } catch (err) {
    console.error('otimizarRota error:', err)
    res.status(500).json({ error: String(err) })
  }
})
