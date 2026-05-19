import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  type Firestore,
} from 'firebase/firestore'
import type { Notificacao, NotificacaoInsert, PushToken, PushTokenInsert } from '../types'

function toNotificacao(id: string, data: Record<string, unknown>): Notificacao {
  return { id, ...data } as Notificacao
}

export async function listNotificacoes(
  db: Firestore,
  destinatarioId: string,
  limitCount = 50,
): Promise<Notificacao[]> {
  const snap = await getDocs(
    query(
      collection(db, 'notificacoes'),
      where('destinatario_id', '==', destinatarioId),
      orderBy('created_at', 'desc'),
      firestoreLimit(limitCount),
    ),
  )
  return snap.docs.map((d) => toNotificacao(d.id, d.data()))
}

export async function countUnreadNotificacoes(
  db: Firestore,
  destinatarioId: string,
): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, 'notificacoes'),
      where('destinatario_id', '==', destinatarioId),
      where('lida', '==', false),
    ),
  )
  return snap.size
}

export async function markNotificacaoAsRead(db: Firestore, id: string): Promise<void> {
  await updateDoc(doc(db, 'notificacoes', id), {
    lida: true,
    lida_em: new Date().toISOString(),
  })
}

export async function markAllNotificacoesAsRead(
  db: Firestore,
  destinatarioId: string,
): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notificacoes'),
      where('destinatario_id', '==', destinatarioId),
      where('lida', '==', false),
    ),
  )
  const now = new Date().toISOString()
  await Promise.all(
    snap.docs.map((d) => updateDoc(d.ref, { lida: true, lida_em: now })),
  )
}

export async function createNotificacao(
  db: Firestore,
  input: NotificacaoInsert,
): Promise<Notificacao> {
  const ref = await addDoc(collection(db, 'notificacoes'), {
    ...input,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return toNotificacao(snap.id, snap.data()!)
}

export async function upsertPushToken(
  db: Firestore,
  input: PushTokenInsert,
): Promise<PushToken> {
  const snap = await getDocs(
    query(collection(db, 'push_tokens'), where('token', '==', input.token)),
  )
  if (!snap.empty) {
    const tokenDoc = snap.docs[0]!
    await updateDoc(tokenDoc.ref, input)
    return { id: tokenDoc.id, ...input, created_at: (tokenDoc.data() as { created_at: string }).created_at }
  }
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'push_tokens'), { ...input, created_at: now })
  return { id: ref.id, ...input, created_at: now }
}

export async function deletePushToken(db: Firestore, token: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'push_tokens'), where('token', '==', token)),
  )
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
}
