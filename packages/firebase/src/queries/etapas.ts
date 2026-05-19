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
import type { ProcessoEtapa, ProcessoEtapaInsert, StatusProcessoEtapa } from '../types'

export interface EtapaPendenteItem extends ProcessoEtapa {
  cliente_id: string
  cliente_nome: string
}

const URGENCY_ORDER: Record<StatusProcessoEtapa, number> = {
  atrasado: 0,
  em_andamento: 1,
  pendente: 2,
  concluido: 3,
}

function toEtapa(id: string, data: Record<string, unknown>): ProcessoEtapa {
  return { id, ...data } as ProcessoEtapa
}

export async function listEtapasByProcesso(
  db: Firestore,
  processoId: string,
): Promise<ProcessoEtapa[]> {
  const snap = await getDocs(
    query(
      collection(db, 'processo_etapas'),
      where('processo_id', '==', processoId),
      orderBy('ordem'),
    ),
  )
  return snap.docs.map((d) => toEtapa(d.id, d.data()))
}

export async function createEtapa(
  db: Firestore,
  input: ProcessoEtapaInsert,
): Promise<ProcessoEtapa> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'processo_etapas'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toEtapa(snap.id, snap.data()!)
}

export async function updateEtapa(
  db: Firestore,
  id: string,
  input: Partial<Omit<ProcessoEtapaInsert, 'processo_id'>>,
): Promise<ProcessoEtapa> {
  await updateDoc(doc(db, 'processo_etapas', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'processo_etapas', id))
  return toEtapa(snap.id, snap.data()!)
}

export async function reorderEtapas(
  db: Firestore,
  updates: Array<{ id: string; ordem: number }>,
): Promise<void> {
  const now = new Date().toISOString()
  await Promise.all(
    updates.map((u) => updateDoc(doc(db, 'processo_etapas', u.id), { ordem: u.ordem, updated_at: now })),
  )
}

export async function deleteEtapa(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'processo_etapas', id))
}

export async function listEtapasPendentesAssessoria(db: Firestore): Promise<EtapaPendenteItem[]> {
  const snap = await getDocs(
    query(collection(db, 'processo_etapas'), where('responsavel', '==', 'assessoria')),
  )

  const etapas = snap.docs
    .map((d) => toEtapa(d.id, d.data()))
    .filter((e) => e.status !== 'concluido')
    .sort((a, b) => {
      const diff = URGENCY_ORDER[a.status as StatusProcessoEtapa] - URGENCY_ORDER[b.status as StatusProcessoEtapa]
      if (diff !== 0) return diff
      if (a.data_agendada && b.data_agendada) return a.data_agendada.localeCompare(b.data_agendada)
      if (a.data_agendada) return -1
      if (b.data_agendada) return 1
      return 0
    })

  const processoIds = [...new Set(etapas.map((e) => e.processo_id))]
  const processoSnaps = await Promise.all(processoIds.map((id) => getDoc(doc(db, 'cliente_processos', id))))
  const processoMap = new Map<string, string>()
  processoSnaps.forEach((s) => {
    if (s.exists()) processoMap.set(s.id, s.data().cliente_id as string)
  })

  const clienteIds = [...new Set([...processoMap.values()].filter(Boolean))]
  const clienteSnaps = await Promise.all(clienteIds.map((id) => getDoc(doc(db, 'clientes', id))))
  const clienteMap = new Map<string, string>()
  clienteSnaps.forEach((s) => {
    if (s.exists()) clienteMap.set(s.id, (s.data().profile?.full_name as string) ?? '—')
  })

  return etapas.map((etapa) => {
    const cliente_id = processoMap.get(etapa.processo_id) ?? ''
    const cliente_nome = clienteMap.get(cliente_id) ?? '—'
    return { ...etapa, cliente_id, cliente_nome }
  })
}
