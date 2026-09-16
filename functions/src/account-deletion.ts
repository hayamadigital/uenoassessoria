import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Firestore, DocumentReference, Query } from 'firebase-admin/firestore'
import type { Auth } from 'firebase-admin/auth'
import type { Storage } from 'firebase-admin/storage'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'

export function requireRecentLogin(request: CallableRequest) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre na sua conta.')
  const age = Math.floor(Date.now() / 1000) - Number(request.auth.token.auth_time)
  if (!Number.isFinite(age) || age < 0 || age > 300) {
    throw new HttpsError('failed-precondition', 'Confirme sua senha novamente.')
  }
  if (request.data?.confirmation !== 'EXCLUIR') throw new HttpsError('invalid-argument', 'Confirme a exclusão.')
  return request.auth.uid
}
export const hashReceipt = (token: string) => createHash('sha256').update(token).digest('hex')
export function validReceipt(token: unknown, hash: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) return false
  return timingSafeEqual(Buffer.from(hashReceipt(token), 'hex'), Buffer.from(hash, 'hex'))
}
export function retentionInput(data: Record<string, unknown>) {
  if (data.retain_business_records !== true) return null
  const reason = typeof data.retention_reason === 'string' ? data.retention_reason.trim() : ''
  const until = typeof data.retention_until === 'string' ? new Date(data.retention_until) : new Date(NaN)
  if (reason.length < 20 || reason.length > 2000 || !Number.isFinite(until.getTime()) || until.getTime() <= Date.now()) {
    throw new HttpsError('invalid-argument', 'Informe a obrigação de retenção e uma data futura para descarte.')
  }
  return { reason, until: until.toISOString() }
}

export async function requestDeletion(db: Firestore, request: CallableRequest) {
  const uid = requireRecentLogin(request)
  const receipt = randomBytes(32).toString('hex')
  const ref = db.collection('account_deletions').doc(uid)
  await db.runTransaction(async tx => {
    const existing = await tx.get(ref)
    if (existing.exists && existing.data()?.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Sua exclusão já está em processamento.')
    }
    const profile = await tx.get(db.collection('users').doc(uid))
    tx.set(ref, {
      status: 'pending', receipt_hash: hashReceipt(receipt),
      requested_at: existing.data()?.requested_at ?? new Date().toISOString(),
      name: profile.data()?.full_name ?? '', email: request.auth!.token.email ?? '',
    })
  })
  return { id: uid, receipt }
}

// Persist the ownership inventory before deleting anything: retries must still find
// descendants and storage prefixes after parent documents have been removed.
export async function processDeletion(db: Firestore, auth: Auth, storage: Storage, uid: string, retention: ReturnType<typeof retentionInput>) {
  const jobRef = db.collection('account_deletions').doc(uid)
  const job = await jobRef.get()
  if (!job.exists) throw new HttpsError('not-found', 'Solicitação não encontrada.')
  if (job.data()?.status === 'completed') return
  const policy = job.data()?.status === 'processing' ? job.data()?.retention ?? null : retention
  let inventory = job.data()?.inventory as { clients: string[]; payments: string[]; processes: string[]; signedContracts: string[] } | undefined
  if (!inventory) {
    const clients = await db.collection('clientes').where('profile_id', '==', uid).get()
    const payments: string[] = [], processes: string[] = [], signedContracts: string[] = []
    for (const client of clients.docs) {
      for (const doc of (await db.collection('contratos').where('cliente_id', '==', client.id).get()).docs) { if (doc.data().status === 'assinado') signedContracts.push(`${client.id}/${doc.id}`) }
      for (const doc of (await db.collection('pagamentos').where('cliente_id', '==', client.id).get()).docs) payments.push(doc.id)
      for (const doc of (await db.collection('cliente_processos').where('cliente_id', '==', client.id).get()).docs) processes.push(doc.id)
    }
    inventory = { clients: clients.docs.map(d => d.id), payments, processes, signedContracts }
  }
  await jobRef.update({ status: 'processing', inventory, retention: policy, updated_at: new Date().toISOString() })
  try { await auth.updateUser(uid, { disabled: true }); await auth.revokeRefreshTokens(uid) }
  catch (error) { if ((error as { code?: string }).code !== 'auth/user-not-found') throw error }
  const bucket = storage.bucket()
  const archive = db.collection('_retained_accounts').doc(uid)
  if (policy) {
    await archive.set({ expires_at: policy.until, reason: policy.reason }, { merge: true })
  }
  async function removeDoc(ref: DocumentReference, retain = false) {
    if (retain && policy) {
      const snapshot = await ref.get()
      if (snapshot.exists) {
        const id = Buffer.from(ref.path).toString('base64url')
        await archive.collection('records').doc(id).set({ original_path: ref.path, data: snapshot.data()! })
        for (const sub of await ref.listCollections()) {
          for (const child of (await sub.get()).docs) await removeDoc(child.ref, true)
        }
      }
    }
    await db.recursiveDelete(ref)
  }
  async function removeQuery(query: Query, retain = false) {
    // Bounded pages; no 500-write batch limit and resumable after partial failure.
    for (;;) {
      const page = await query.limit(100).get()
      if (page.empty) break
      for (const doc of page.docs) await removeDoc(doc.ref, retain && (doc.ref.parent.id !== 'contratos' || doc.data().status === 'assinado'))
    }
  }
  async function removeFiles(prefix: string, retain = false, allowedPrefixes?: string[]) {
    // GCS paginates this async iterator without loading the entire bucket.
    const stream = bucket.getFilesStream({ prefix })
    for await (const file of stream) {
      if (retain && policy && (!allowedPrefixes || allowedPrefixes.some(p => file.name.startsWith(p)))) {
        const target = bucket.file(`retained-accounts/${uid}/${file.name}`)
        // Strip download tokens in the copy itself. A crash between copy and a
        // separate metadata update must never leave a public legal archive.
        await file.copy(target, {
          cacheControl: 'private, no-store',
          metadata: { firebaseStorageDownloadTokens: null },
        })
      }
      await file.delete({ ignoreNotFound: true })
    }
  }
  for (const id of inventory.clients) {
    for (const name of ['contratos', 'pagamentos']) await removeQuery(db.collection(name).where('cliente_id', '==', id), true)
    for (const name of ['agendamentos', 'avaliacoes', 'simulado_resultados']) await removeQuery(db.collection(name).where('cliente_id', '==', id))
    await removeQuery(db.collectionGroup('paradas').where('cliente_id', '==', id))
    await removeFiles(`contratos/${id}/`, true, inventory.signedContracts.map(key => `contratos/${key}/`))
    await removeFiles(`assinaturas/${id}/`, inventory.signedContracts.some(key => key.startsWith(`${id}/`)))
    await removeFiles(`documentos/${id}/`)
    // Keep only identity required to understand retained contract/payment records.
    if (policy) {
      const client = await db.collection('clientes').doc(id).get()
      if (client.exists) await archive.collection('records').doc(`identity-${id}`).set({
        cliente_id: id, name: job.data()?.name ?? '', cpf: client.data()?.cpf ?? null,
      })
    }
    await removeDoc(db.collection('clientes').doc(id))
  }
  for (const id of inventory.payments) await removeFiles(`comprovantes/${id}/`, true)
  for (const id of inventory.processes) {
    await removeQuery(db.collection('processo_etapas').where('processo_id', '==', id))
    await removeDoc(db.collection('cliente_processos').doc(id))
  }
  for (const [name, field] of [['notificacoes', 'destinatario_id'], ['push_tokens', 'profile_id'], ['simulado_resultados', 'cliente_id'], ['questao_erro_reports', 'reportado_por']] as const) {
    await removeQuery(db.collection(name).where(field, '==', uid))
  }
  // Staff accounts can be deleted without deleting their clients' business records.
  for (const [name, field, extra] of [
    ['clientes', 'assigned_instrutor_id', {}],
    ['agendamentos', 'instrutor_id', { instrutor_nome: null }],
    ['avaliacoes', 'instrutor_id', {}],
    ['rotas_dia', 'instrutor_id', {}],
    ['agendamentos', 'created_by', {}],
    ['contratos', 'enviado_por', {}],
  ] as const) {
    for (;;) {
      const page = await db.collection(name).where(field, '==', uid).limit(100).get()
      if (page.empty) break
      for (const doc of page.docs) await doc.ref.update({ [field]: null, ...extra })
    }
  }
  await removeFiles(`avatares/${uid}/`)
  await removeDoc(db.collection('users').doc(uid))
  try { await auth.deleteUser(uid) }
  catch (error) { if ((error as { code?: string }).code !== 'auth/user-not-found') throw error }
  // Anonymous receipt: no name/email or ownership inventory remains after completion.
  await jobRef.set({ status: 'completed', receipt_hash: job.data()!.receipt_hash,
    completed_at: new Date().toISOString(),
    retention: policy ? { reason: policy.reason, until: policy.until } : null,
  })
}
