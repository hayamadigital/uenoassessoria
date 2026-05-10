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
import type { DestinoFixo } from '../types'

function toDestino(id: string, data: Record<string, unknown>): DestinoFixo {
  return { id, ...data } as DestinoFixo
}

export async function listDestinos(db: Firestore, onlyActive = false): Promise<DestinoFixo[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('ordem'), orderBy('nome')]
  if (onlyActive) constraints.push(where('is_active', '==', true))
  const snap = await getDocs(query(collection(db, 'destinos_fixos'), ...constraints))
  return snap.docs.map((d) => toDestino(d.id, d.data()))
}

export async function createDestino(
  db: Firestore,
  input: { nome: string; endereco: string; ordem?: number },
): Promise<DestinoFixo> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'destinos_fixos'), {
    nome: input.nome,
    endereco: input.endereco,
    ordem: input.ordem ?? 0,
    is_active: true,
    created_at: now,
    updated_at: now,
  })
  const snap = await getDoc(ref)
  return toDestino(snap.id, snap.data()!)
}

export async function updateDestino(
  db: Firestore,
  id: string,
  input: { nome?: string; endereco?: string; is_active?: boolean; ordem?: number },
): Promise<DestinoFixo> {
  await updateDoc(doc(db, 'destinos_fixos', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'destinos_fixos', id))
  return toDestino(snap.id, snap.data()!)
}

export async function toggleDestinoAtivo(
  db: Firestore,
  id: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'destinos_fixos', id), { is_active: isActive, updated_at: new Date().toISOString() })
}
