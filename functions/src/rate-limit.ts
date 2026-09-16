import { createHash } from 'node:crypto'
import type { Firestore } from 'firebase-admin/firestore'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'

// One bounded document per user/operation; shared across function instances.
export async function enforceRateLimit(
  db: Firestore,
  request: CallableRequest,
  operation: string,
  limit: number,
  windowMs = 60_000,
) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Não autenticado')
  const deletion = await db.doc(`account_deletions/${request.auth.uid}`).get()
  if (deletion.exists && deletion.data()?.status !== 'pending') {
    throw new HttpsError('permission-denied', 'A exclusão desta conta está em andamento.')
  }
  const key = createHash('sha256').update(`${operation}:${request.auth.uid}`).digest('hex')
  const ref = db.collection('_rate_limits').doc(key)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const now = Date.now()
    const previous = snapshot.data()
    const active = previous && previous.resetAt > now
    const count = active ? previous.count : 0
    const resetAt = active ? previous.resetAt : now + windowMs
    if (count >= limit) {
      throw new HttpsError('resource-exhausted', 'Muitas solicitações. Aguarde antes de tentar novamente.', {
        retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
      })
    }
    transaction.set(ref, { count: count + 1, resetAt })
  })
}

// Para callables públicos (sem request.auth), como o cadastro rápido do evento —
// limita por IP em vez de por uid. Mesma mecânica de janela deslizante acima.
export async function enforceRateLimitByIp(
  db: Firestore,
  request: CallableRequest,
  operation: string,
  limit: number,
  windowMs = 60_000,
) {
  const ip = request.rawRequest?.ip ?? 'unknown'
  const key = createHash('sha256').update(`${operation}:${ip}`).digest('hex')
  const ref = db.collection('_rate_limits').doc(key)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const now = Date.now()
    const previous = snapshot.data()
    const active = previous && previous.resetAt > now
    const count = active ? previous.count : 0
    const resetAt = active ? previous.resetAt : now + windowMs
    if (count >= limit) {
      throw new HttpsError('resource-exhausted', 'Muitas solicitações. Aguarde antes de tentar novamente.', {
        retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
      })
    }
    transaction.set(ref, { count: count + 1, resetAt })
  })
}
