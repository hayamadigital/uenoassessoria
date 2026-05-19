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
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { ServicoVariacao, ServicoVariacaoInsert } from '../types'

function removeUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T
}

function toServicoVariacao(id: string, data: Record<string, unknown>): ServicoVariacao {
  return {
    id,
    ...data,
    preco_jpy: data.preco_jpy ?? null,
    preco_variavel: Boolean(data.preco_variavel),
    preco_min_jpy: data.preco_min_jpy ?? null,
    preco_max_jpy: data.preco_max_jpy ?? null,
  } as ServicoVariacao
}

export async function listVariacoesByServico(
  db: Firestore,
  servicoId: string,
  onlyActive = false,
): Promise<ServicoVariacao[]> {
  const snap = await getDocs(
    query(collection(db, 'servico_variacoes'), where('servico_id', '==', servicoId)),
  )
  return snap.docs
    .map((d) => toServicoVariacao(d.id, d.data()))
    .filter((variacao) => !onlyActive || variacao.ativo)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function getServicoVariacao(db: Firestore, id: string): Promise<ServicoVariacao> {
  const snap = await getDoc(doc(db, 'servico_variacoes', id))
  if (!snap.exists()) throw new Error('Variação do serviço não encontrada')
  return toServicoVariacao(snap.id, snap.data())
}

export async function createServicoVariacao(
  db: Firestore,
  input: ServicoVariacaoInsert,
): Promise<ServicoVariacao> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'servico_variacoes'), removeUndefined({
    ...input,
    descricao: input.descricao ?? null,
    duracao_texto: input.duracao_texto ?? null,
    preco_jpy: input.preco_jpy ?? null,
    preco_min_jpy: input.preco_min_jpy ?? null,
    preco_max_jpy: input.preco_max_jpy ?? null,
    preco_variavel: Boolean(input.preco_variavel),
    ativo: input.ativo ?? true,
    ordem: input.ordem ?? 0,
    created_at: now,
    updated_at: now,
  }))
  const snap = await getDoc(ref)
  return toServicoVariacao(snap.id, snap.data()!)
}

export async function updateServicoVariacao(
  db: Firestore,
  id: string,
  input: Partial<Omit<ServicoVariacaoInsert, 'servico_id'>>,
): Promise<ServicoVariacao> {
  await updateDoc(doc(db, 'servico_variacoes', id), removeUndefined({
    ...input,
    updated_at: new Date().toISOString(),
  }))
  return getServicoVariacao(db, id)
}

export async function toggleServicoVariacaoStatus(
  db: Firestore,
  id: string,
  ativo: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'servico_variacoes', id), { ativo, updated_at: new Date().toISOString() })
}

export async function reorderServicoVariacoes(
  db: Firestore,
  updates: Array<{ id: string; ordem: number }>,
): Promise<void> {
  const batch = writeBatch(db)
  updates.forEach(({ id, ordem }) => {
    batch.update(doc(db, 'servico_variacoes', id), {
      ordem,
      updated_at: new Date().toISOString(),
    })
  })
  await batch.commit()
}

export async function deleteServicoVariacao(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'servico_variacoes', id))
}
