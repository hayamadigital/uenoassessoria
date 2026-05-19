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
import { getServicoVariacao } from './servico_variacoes'

async function resolveVariacao(db: Firestore, variacaoId: unknown) {
  if (!variacaoId) return null
  try {
    return await getServicoVariacao(db, variacaoId as string)
  } catch {
    return null
  }
}

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
      const variacao = await resolveVariacao(db, data.variacao_id)
      return {
        id: d.id,
        variacao_id: null,
        ...data,
        servico: { id: servicoSnap.id, ...servicoSnap.data() },
        variacao,
      } as ClienteProcessoWithServico
    }),
  )
}

export async function getProcesso(db: Firestore, id: string): Promise<ClienteProcessoWithServico> {
  const snap = await getDoc(doc(db, 'cliente_processos', id))
  if (!snap.exists()) throw new Error('Processo not found')
  const data = snap.data()
  const servicoSnap = await getDoc(doc(db, 'servicos', data.servico_id as string))
  const variacao = await resolveVariacao(db, data.variacao_id)
  return {
    id: snap.id,
    variacao_id: null,
    ...data,
    servico: { id: servicoSnap.id, ...servicoSnap.data() },
    variacao,
  } as ClienteProcessoWithServico
}

export async function createProcesso(
  db: Firestore,
  input: ClienteProcessoInsert,
): Promise<ClienteProcessoWithServico> {
  const now = new Date().toISOString()
  const servicoSnap = await getDoc(doc(db, 'servicos', input.servico_id))
  if (!servicoSnap.exists()) throw new Error('Serviço não encontrado')
  const servico = servicoSnap.data()
  if (servico.usa_variacoes && !input.variacao_id) {
    throw new Error('Selecione a variação para abrir este processo.')
  }
  if (input.variacao_id) {
    const variacao = await getServicoVariacao(db, input.variacao_id)
    if (variacao.servico_id !== input.servico_id) {
      throw new Error('A variação selecionada não pertence ao serviço.')
    }
  }
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
