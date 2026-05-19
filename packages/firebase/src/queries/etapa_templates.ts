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
import type { EtapaTemplate, EtapaTemplateInsert } from '../types'

function toTemplate(id: string, data: Record<string, unknown>): EtapaTemplate {
  return {
    id,
    ...data,
    descricao: data.descricao ?? null,
    variacao_ids: Array.isArray(data.variacao_ids) ? data.variacao_ids as string[] : [],
  } as EtapaTemplate
}

function removeUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T
}

export async function listEtapaTemplatesByServico(
  db: Firestore,
  servicoId: string,
  variacaoId?: string | null,
): Promise<EtapaTemplate[]> {
  const snap = await getDocs(
    query(
      collection(db, 'etapa_templates'),
      where('servico_id', '==', servicoId),
      orderBy('ordem'),
    ),
  )
  return snap.docs
    .map((d) => toTemplate(d.id, d.data()))
    .filter((template) => {
      if (!variacaoId) return true
      return template.variacao_ids.length === 0 || template.variacao_ids.includes(variacaoId)
    })
}

export async function createEtapaTemplate(
  db: Firestore,
  input: EtapaTemplateInsert,
): Promise<EtapaTemplate> {
  const ref = await addDoc(collection(db, 'etapa_templates'), removeUndefined({
    ...input,
    descricao: input.descricao ?? null,
    variacao_ids: input.variacao_ids ?? [],
    ordem: input.ordem ?? 0,
    created_at: new Date().toISOString(),
  }))
  const snap = await getDoc(ref)
  return toTemplate(snap.id, snap.data()!)
}

export async function updateEtapaTemplate(
  db: Firestore,
  id: string,
  input: Partial<Omit<EtapaTemplateInsert, 'servico_id'>>,
): Promise<EtapaTemplate> {
  await updateDoc(doc(db, 'etapa_templates', id), removeUndefined(input))
  const snap = await getDoc(doc(db, 'etapa_templates', id))
  return toTemplate(snap.id, snap.data()!)
}

export async function reorderEtapaTemplates(
  db: Firestore,
  updates: Array<{ id: string; ordem: number }>,
): Promise<void> {
  await Promise.all(updates.map((u) => updateDoc(doc(db, 'etapa_templates', u.id), { ordem: u.ordem })))
}

export async function deleteEtapaTemplate(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'etapa_templates', id))
}
