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
import { getProfile } from './perfis'
import { getCliente } from './clientes'
import type { Agendamento, AgendamentoInsert, AgendamentoWithRelations, StatusAgendamento } from '../types'

export interface AgendamentoFilters {
  cliente_id?: string
  instrutor_id?: string
  status?: StatusAgendamento
  data_inicio?: string
  data_fim?: string
}

function toAgendamento(id: string, data: Record<string, unknown>): Agendamento {
  return { id, ...data } as Agendamento
}

async function enrichAgendamento(db: Firestore, ag: Agendamento): Promise<AgendamentoWithRelations> {
  const [cliente, instrutor, servico] = await Promise.all([
    getCliente(db, ag.cliente_id),
    getProfile(db, ag.instrutor_id),
    getDoc(doc(db, 'servicos', ag.servico_id)).then((s) => ({ id: s.id, ...s.data()! })),
  ])
  return { ...ag, cliente, instrutor, servico } as AgendamentoWithRelations
}

export async function listAgendamentos(
  db: Firestore,
  filters: AgendamentoFilters = {},
): Promise<AgendamentoWithRelations[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('data_hora_inicio')]

  if (filters.cliente_id) constraints.push(where('cliente_id', '==', filters.cliente_id))
  if (filters.instrutor_id) constraints.push(where('instrutor_id', '==', filters.instrutor_id))
  if (filters.status) constraints.push(where('status', '==', filters.status))
  if (filters.data_inicio) constraints.push(where('data_hora_inicio', '>=', filters.data_inicio))
  if (filters.data_fim) constraints.push(where('data_hora_inicio', '<=', filters.data_fim))

  const snap = await getDocs(query(collection(db, 'agendamentos'), ...constraints))
  const agendamentos = snap.docs.map((d) => toAgendamento(d.id, d.data()))
  return Promise.all(agendamentos.map((ag) => enrichAgendamento(db, ag)))
}

export async function getAgendamento(
  db: Firestore,
  id: string,
): Promise<AgendamentoWithRelations> {
  const snap = await getDoc(doc(db, 'agendamentos', id))
  if (!snap.exists()) throw new Error('Agendamento not found')
  return enrichAgendamento(db, toAgendamento(snap.id, snap.data()))
}

export async function listAgendamentosByDate(
  db: Firestore,
  dateJST: string,
): Promise<AgendamentoWithRelations[]> {
  const startUTC = new Date(`${dateJST}T00:00:00+09:00`).toISOString()
  const endUTC = new Date(`${dateJST}T23:59:59+09:00`).toISOString()
  return listAgendamentos(db, { data_inicio: startUTC, data_fim: endUTC })
}

export async function createAgendamento(
  db: Firestore,
  input: AgendamentoInsert,
): Promise<Agendamento> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'agendamentos'), {
    ...input,
    created_at: now,
    updated_at: now,
  })
  const snap = await getDoc(ref)
  return toAgendamento(snap.id, snap.data()!)
}

export async function updateAgendamento(
  db: Firestore,
  id: string,
  input: Partial<AgendamentoInsert>,
): Promise<Agendamento> {
  await updateDoc(doc(db, 'agendamentos', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'agendamentos', id))
  return toAgendamento(snap.id, snap.data()!)
}

export async function updateAgendamentoStatus(
  db: Firestore,
  id: string,
  status: StatusAgendamento,
): Promise<void> {
  await updateDoc(doc(db, 'agendamentos', id), {
    status,
    updated_at: new Date().toISOString(),
  })
}
