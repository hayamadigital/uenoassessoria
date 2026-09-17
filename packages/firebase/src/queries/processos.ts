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
  type Firestore,
} from 'firebase/firestore'
import type {
  ClienteProcessoInsert,
  ClienteProcessoWithCliente,
  ClienteProcessoWithServico,
  ServicoSnapshot,
  VariacaoSnapshot,
} from '../types'
import { getCliente } from './clientes'
import { getServico } from './servicos'
import { getServicoVariacao } from './servico_variacoes'

// Processos criados antes do snapshot (ver scripts/backfill-cliente-processos-snapshot.mjs)
// não têm servico_snapshot ainda: nunca devolver null aqui, ou toda tela que faz
// processo.servico.nome quebra. O fallback é só um placeholder de exibição.
const FALLBACK_SERVICO_SNAPSHOT: ServicoSnapshot = {
  nome: 'Serviço',
  descricao: null,
  duracao_min: 0,
  duracao_texto: null,
  preco_jpy: 0,
  preco_variavel: false,
  preco_min_jpy: null,
  preco_max_jpy: null,
  usa_variacoes: false,
  imagem_url: null,
  is_active: true,
  ordem: 0,
  created_at: '',
  updated_at: '',
}

function withResolvedSnapshot<T extends { servico_snapshot?: ServicoSnapshot; variacao_snapshot?: VariacaoSnapshot | null }>(
  data: T,
) {
  return {
    ...data,
    servico: data.servico_snapshot ?? FALLBACK_SERVICO_SNAPSHOT,
    variacao: data.variacao_snapshot ?? null,
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
    ),
  )

  const processos = snap.docs.map((d) => ({
    id: d.id,
    variacao_id: null,
    ...withResolvedSnapshot(d.data()),
  }) as unknown as ClienteProcessoWithServico)

  return processos.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function listProcessosAtivos(
  db: Firestore,
): Promise<ClienteProcessoWithCliente[]> {
  const snap = await getDocs(
    query(collection(db, 'cliente_processos'), where('status', 'in', ['analise', 'ativo'])),
  )

  const processos = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data()
      const cliente = await getCliente(db, data.cliente_id as string)
      return {
        id: d.id,
        variacao_id: null,
        ...withResolvedSnapshot(data),
        cliente,
      } as unknown as ClienteProcessoWithCliente
    }),
  )

  return processos.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getProcesso(db: Firestore, id: string): Promise<ClienteProcessoWithServico> {
  const snap = await getDoc(doc(db, 'cliente_processos', id))
  if (!snap.exists()) throw new Error('Processo not found')
  const data = snap.data()
  return {
    id: snap.id,
    variacao_id: null,
    ...withResolvedSnapshot(data),
  } as unknown as ClienteProcessoWithServico
}

export async function createProcesso(
  db: Firestore,
  input: ClienteProcessoInsert,
): Promise<ClienteProcessoWithServico> {
  const now = new Date().toISOString()
  let servico
  try {
    servico = await getServico(db, input.servico_id)
  } catch {
    throw new Error('Serviço não encontrado')
  }
  if (servico.usa_variacoes && !input.variacao_id) {
    throw new Error('Selecione a variação para abrir este processo.')
  }
  let variacaoSnapshot: VariacaoSnapshot | null = null
  if (input.variacao_id) {
    const variacao = await getServicoVariacao(db, input.variacao_id)
    if (variacao.servico_id !== input.servico_id) {
      throw new Error('A variação selecionada não pertence ao serviço.')
    }
    const { id: _variacaoId, servico_id: _servicoId, ...variacaoRest } = variacao
    variacaoSnapshot = variacaoRest
  }
  const { id: _servicoId, ...servicoSnapshot } = servico
  const ref = await addDoc(collection(db, 'cliente_processos'), {
    ...input,
    servico_snapshot: servicoSnapshot,
    variacao_snapshot: variacaoSnapshot,
    created_at: now,
    updated_at: now,
  })
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
