import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import type { Aviso, AvisoInsert, StatusAviso } from '../types'

function toAviso(id: string, data: Record<string, unknown>): Aviso {
  return { id, ...data } as Aviso
}

export function computeStatusAviso(aviso: Aviso): StatusAviso {
  const now = new Date().toISOString()
  if (aviso.data_publicacao > now) return 'agendado'
  if (aviso.data_encerramento >= now) return 'ativo'
  return 'encerrado'
}

export async function listAvisos(db: Firestore): Promise<Aviso[]> {
  const snap = await getDocs(
    query(collection(db, 'avisos'), orderBy('data_publicacao', 'desc')),
  )
  return snap.docs.map((d) => toAviso(d.id, d.data()))
}

export async function listAvisosAtivos(
  db: Firestore,
  tipoProcesso?: string,
): Promise<Aviso[]> {
  const now = new Date().toISOString()
  const snap = await getDocs(
    query(collection(db, 'avisos'), orderBy('data_publicacao', 'desc')),
  )
  return snap.docs
    .map((d) => toAviso(d.id, d.data()))
    .filter(
      (a) =>
        a.data_publicacao <= now &&
        a.data_encerramento >= now &&
        (a.broadcast || (tipoProcesso != null && a.tipos_processo.includes(tipoProcesso))),
    )
}

export async function getAviso(db: Firestore, id: string): Promise<Aviso | null> {
  const snap = await getDoc(doc(db, 'avisos', id))
  if (!snap.exists()) return null
  return toAviso(snap.id, snap.data())
}

export async function createAviso(db: Firestore, input: AvisoInsert): Promise<Aviso> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'avisos'), {
    ...input,
    created_at: now,
    updated_at: now,
  })
  const snap = await getDoc(ref)
  return toAviso(snap.id, snap.data()!)
}

export async function updateAviso(
  db: Firestore,
  id: string,
  input: Partial<AvisoInsert>,
): Promise<Aviso> {
  const ref = doc(db, 'avisos', id)
  await updateDoc(ref, { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(ref)
  return toAviso(snap.id, snap.data()!)
}

export async function deleteAviso(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'avisos', id))
}
