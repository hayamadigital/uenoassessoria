import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore'
import type { Servico, ServicoInsert } from '../types'

function removeUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'sim', 's', 'ativo', 'ativa'].includes(normalized)) return true
    if (['false', '0', 'nao', 'não', 'n', 'inativo', 'inativa'].includes(normalized)) return false
  }
  return fallback
}

function toNumberOrFallback(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toServico(id: string, data: Record<string, unknown>): Servico {
  return {
    id,
    ...data,
    preco_jpy: data.preco_jpy ?? null,
    preco_variavel: toBoolean(data.preco_variavel, false),
    preco_min_jpy: data.preco_min_jpy ?? null,
    preco_max_jpy: data.preco_max_jpy ?? null,
    usa_variacoes: toBoolean(data.usa_variacoes, false),
    imagem_url: data.imagem_url ?? null,
    is_active: toBoolean(data.is_active ?? data.ativo, true),
    ordem: toNumberOrFallback(data.ordem, 0),
  } as Servico
}

export async function listServicos(db: Firestore, onlyActive = true): Promise<Servico[]> {
  const snap = await getDocs(collection(db, 'servicos'))
  return snap.docs
    .map((d) => toServico(d.id, d.data()))
    .filter((servico) => !onlyActive || servico.is_active)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function getServico(db: Firestore, id: string): Promise<Servico> {
  const snap = await getDoc(doc(db, 'servicos', id))
  if (!snap.exists()) throw new Error('Servico not found')
  return toServico(snap.id, snap.data())
}

export async function createServico(db: Firestore, input: ServicoInsert): Promise<Servico> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'servicos'), removeUndefined({
    ...input,
    descricao: input.descricao ?? null,
    duracao_texto: input.duracao_texto ?? null,
    duracao_min: input.duracao_min ?? 0,
    preco_jpy: input.preco_jpy ?? null,
    preco_min_jpy: input.preco_min_jpy ?? null,
    preco_max_jpy: input.preco_max_jpy ?? null,
    preco_variavel: Boolean(input.preco_variavel),
    usa_variacoes: Boolean(input.usa_variacoes),
    imagem_url: input.imagem_url ?? null,
    is_active: input.is_active ?? true,
    ordem: input.ordem ?? 0,
    created_at: now,
    updated_at: now,
  }))
  const snap = await getDoc(ref)
  return toServico(snap.id, snap.data()!)
}

export async function updateServico(
  db: Firestore,
  id: string,
  input: Partial<ServicoInsert>,
): Promise<Servico> {
  await updateDoc(doc(db, 'servicos', id), removeUndefined({ ...input, updated_at: new Date().toISOString() }))
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

export async function deleteServico(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'servicos', id))
}
