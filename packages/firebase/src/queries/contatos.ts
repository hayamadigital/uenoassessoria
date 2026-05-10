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
import type { ClienteContato, ClienteContatoInsert } from '../types'

function toContato(id: string, data: Record<string, unknown>): ClienteContato {
  return { id, ...data } as ClienteContato
}

export async function listContatosByCliente(
  db: Firestore,
  clienteId: string,
): Promise<ClienteContato[]> {
  const snap = await getDocs(
    query(
      collection(db, 'clientes', clienteId, 'contatos'),
      orderBy('is_principal', 'desc'),
      orderBy('created_at'),
    ),
  )
  return snap.docs.map((d) => toContato(d.id, d.data()))
}

export async function createContato(
  db: Firestore,
  input: ClienteContatoInsert,
): Promise<ClienteContato> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'clientes', input.cliente_id, 'contatos'), {
    ...input,
    created_at: now,
    updated_at: now,
  })
  const snap = await getDoc(ref)
  return toContato(snap.id, snap.data()!)
}

export async function updateContato(
  db: Firestore,
  clienteId: string,
  id: string,
  input: Partial<Omit<ClienteContatoInsert, 'cliente_id'>>,
): Promise<ClienteContato> {
  await updateDoc(doc(db, 'clientes', clienteId, 'contatos', id), {
    ...input,
    updated_at: new Date().toISOString(),
  })
  const snap = await getDoc(doc(db, 'clientes', clienteId, 'contatos', id))
  return toContato(snap.id, snap.data()!)
}

export async function deleteContato(
  db: Firestore,
  clienteId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, 'clientes', clienteId, 'contatos', id))
}
