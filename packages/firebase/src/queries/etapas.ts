import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import type { ProcessoEtapa, ProcessoEtapaInsert } from '../types'

function toEtapa(id: string, data: Record<string, unknown>): ProcessoEtapa {
  return { id, ...data } as ProcessoEtapa
}

export async function listEtapasByProcesso(
  db: Firestore,
  processoId: string,
): Promise<ProcessoEtapa[]> {
  const snap = await getDocs(
    query(
      collection(db, 'processo_etapas'),
      where('processo_id', '==', processoId),
      orderBy('ordem'),
    ),
  )
  return snap.docs.map((d) => toEtapa(d.id, d.data()))
}

export async function createEtapa(
  db: Firestore,
  input: ProcessoEtapaInsert,
): Promise<ProcessoEtapa> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'processo_etapas'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toEtapa(snap.id, snap.data()!)
}

export async function updateEtapa(
  db: Firestore,
  id: string,
  input: Partial<Omit<ProcessoEtapaInsert, 'processo_id'>>,
): Promise<ProcessoEtapa> {
  await updateDoc(doc(db, 'processo_etapas', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'processo_etapas', id))
  return toEtapa(snap.id, snap.data()!)
}

export async function reorderEtapas(
  db: Firestore,
  updates: Array<{ id: string; ordem: number }>,
): Promise<void> {
  const now = new Date().toISOString()
  await Promise.all(
    updates.map((u) => updateDoc(doc(db, 'processo_etapas', u.id), { ordem: u.ordem, updated_at: now })),
  )
}

export async function deleteEtapa(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'processo_etapas', id))
}
