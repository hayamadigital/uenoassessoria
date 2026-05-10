import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import type { Servico, ServicoInsert } from '../types'

function toServico(id: string, data: Record<string, unknown>): Servico {
  return { id, ...data } as Servico
}

export async function listServicos(db: Firestore, onlyActive = true): Promise<Servico[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('ordem')]
  if (onlyActive) constraints.push(where('is_active', '==', true))
  const snap = await getDocs(query(collection(db, 'servicos'), ...constraints))
  return snap.docs.map((d) => toServico(d.id, d.data()))
}

export async function getServico(db: Firestore, id: string): Promise<Servico> {
  const snap = await getDoc(doc(db, 'servicos', id))
  if (!snap.exists()) throw new Error('Servico not found')
  return toServico(snap.id, snap.data())
}

export async function createServico(db: Firestore, input: ServicoInsert): Promise<Servico> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'servicos'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toServico(snap.id, snap.data()!)
}

export async function updateServico(
  db: Firestore,
  id: string,
  input: Partial<ServicoInsert>,
): Promise<Servico> {
  await updateDoc(doc(db, 'servicos', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'servicos', id))
  return toServico(snap.id, snap.data()!)
}

export async function toggleServicoStatus(
  db: Firestore,
  id: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'servicos', id), { is_active: isActive, updated_at: new Date().toISOString() })
}
