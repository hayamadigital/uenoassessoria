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
import type { ClienteHabilitacao, ClienteHabilitacaoInsert } from '../types'

function toHabilitacao(id: string, data: Record<string, unknown>): ClienteHabilitacao {
  return { id, ...data } as ClienteHabilitacao
}

export async function listHabilitacoesByCliente(
  db: Firestore,
  clienteId: string,
): Promise<ClienteHabilitacao[]> {
  const snap = await getDocs(
    query(collection(db, 'clientes', clienteId, 'habilitacoes'), orderBy('created_at')),
  )
  return snap.docs.map((d) => toHabilitacao(d.id, d.data()))
}

export async function createHabilitacao(
  db: Firestore,
  input: ClienteHabilitacaoInsert,
): Promise<ClienteHabilitacao> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'clientes', input.cliente_id, 'habilitacoes'), {
    ...input,
    created_at: now,
    updated_at: now,
  })
  const snap = await getDoc(ref)
  return toHabilitacao(snap.id, snap.data()!)
}

export async function updateHabilitacao(
  db: Firestore,
  clienteId: string,
  id: string,
  input: Partial<Omit<ClienteHabilitacaoInsert, 'cliente_id'>>,
): Promise<ClienteHabilitacao> {
  await updateDoc(doc(db, 'clientes', clienteId, 'habilitacoes', id), {
    ...input,
    updated_at: new Date().toISOString(),
  })
  const snap = await getDoc(doc(db, 'clientes', clienteId, 'habilitacoes', id))
  return toHabilitacao(snap.id, snap.data()!)
}

export async function deleteHabilitacao(
  db: Firestore,
  clienteId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, 'clientes', clienteId, 'habilitacoes', id))
}
