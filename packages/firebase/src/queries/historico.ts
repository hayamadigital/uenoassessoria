import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import type { ClienteHistoricoInsert, ClienteHistoricoWithResponsavel } from '../types'

export async function listHistoricoByCliente(
  db: Firestore,
  clienteId: string,
): Promise<ClienteHistoricoWithResponsavel[]> {
  const snap = await getDocs(
    query(
      collection(db, 'clientes', clienteId, 'historico'),
      orderBy('created_at', 'desc'),
    ),
  )

  return Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data()
      let responsavel = null
      if (data.responsavel_id) {
        const rSnap = await getDoc(doc(db, 'users', data.responsavel_id as string))
        if (rSnap.exists()) {
          responsavel = { full_name: rSnap.data().full_name as string, email: rSnap.data().email as string }
        }
      }
      return { id: d.id, ...data, responsavel } as ClienteHistoricoWithResponsavel
    }),
  )
}

export async function createHistorico(
  db: Firestore,
  input: ClienteHistoricoInsert,
): Promise<void> {
  await addDoc(collection(db, 'clientes', input.cliente_id, 'historico'), {
    ...input,
    created_at: new Date().toISOString(),
  })
}
