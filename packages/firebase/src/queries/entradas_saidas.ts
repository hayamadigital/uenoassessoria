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
import type { ClienteEntradaSaida, ClienteEntradaSaidaInsert } from '../types'

function toEntradaSaida(id: string, data: Record<string, unknown>): ClienteEntradaSaida {
  return { id, ...data } as ClienteEntradaSaida
}

export async function listEntradasSaidasByCliente(
  db: Firestore,
  clienteId: string,
): Promise<ClienteEntradaSaida[]> {
  const snap = await getDocs(
    query(
      collection(db, 'clientes', clienteId, 'entrada_saida'),
      orderBy('data_viagem', 'desc'),
    ),
  )
  return snap.docs.map((d) => toEntradaSaida(d.id, d.data()))
}

export async function createEntradaSaida(
  db: Firestore,
  input: ClienteEntradaSaidaInsert,
): Promise<ClienteEntradaSaida> {
  const ref = await addDoc(collection(db, 'clientes', input.cliente_id, 'entrada_saida'), {
    ...input,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return toEntradaSaida(snap.id, snap.data()!)
}

export async function updateEntradaSaida(
  db: Firestore,
  clienteId: string,
  id: string,
  input: Partial<Omit<ClienteEntradaSaidaInsert, 'cliente_id'>>,
): Promise<ClienteEntradaSaida> {
  await updateDoc(doc(db, 'clientes', clienteId, 'entrada_saida', id), input)
  const snap = await getDoc(doc(db, 'clientes', clienteId, 'entrada_saida', id))
  return toEntradaSaida(snap.id, snap.data()!)
}

export async function deleteEntradaSaida(
  db: Firestore,
  clienteId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, 'clientes', clienteId, 'entrada_saida', id))
}
