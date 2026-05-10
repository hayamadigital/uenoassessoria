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
import type { ClienteProcessoInsert, ClienteProcessoWithServico } from '../types'

export async function listProcessosByCliente(
  db: Firestore,
  clienteId: string,
): Promise<ClienteProcessoWithServico[]> {
  const snap = await getDocs(
    query(
      collection(db, 'cliente_processos'),
      where('cliente_id', '==', clienteId),
      orderBy('created_at', 'desc'),
    ),
  )

  return Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data()
      const servicoSnap = await getDoc(doc(db, 'servicos', data.servico_id as string))
      return {
        id: d.id,
        ...data,
        servico: { id: servicoSnap.id, ...servicoSnap.data() },
      } as ClienteProcessoWithServico
    }),
  )
}

export async function getProcesso(db: Firestore, id: string): Promise<ClienteProcessoWithServico> {
  const snap = await getDoc(doc(db, 'cliente_processos', id))
  if (!snap.exists()) throw new Error('Processo not found')
  const data = snap.data()
  const servicoSnap = await getDoc(doc(db, 'servicos', data.servico_id as string))
  return { id: snap.id, ...data, servico: { id: servicoSnap.id, ...servicoSnap.data() } } as ClienteProcessoWithServico
}

export async function createProcesso(
  db: Firestore,
  input: ClienteProcessoInsert,
): Promise<ClienteProcessoWithServico> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'cliente_processos'), { ...input, created_at: now, updated_at: now })
  return getProcesso(db, ref.id)
}

export async function updateProcesso(
  db: Firestore,
  id: string,
  input: Partial<Omit<ClienteProcessoInsert, 'cliente_id' | 'servico_id'>>,
): Promise<ClienteProcessoWithServico> {
  await updateDoc(doc(db, 'cliente_processos', id), { ...input, updated_at: new Date().toISOString() })
  return getProcesso(db, id)
}

export async function deleteProcesso(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'cliente_processos', id))
}
