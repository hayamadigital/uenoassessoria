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
  limit,
  type Firestore,
} from 'firebase/firestore'
import type { ContratoTemplate, ContratoTemplateInsert } from '../types'

function toTemplate(id: string, data: Record<string, unknown>): ContratoTemplate {
  return { id, ...data } as ContratoTemplate
}

export async function listContratoTemplates(db: Firestore): Promise<ContratoTemplate[]> {
  const snap = await getDocs(query(collection(db, 'contrato_templates'), orderBy('nome')))
  return snap.docs.map((d) => toTemplate(d.id, d.data()))
}

export async function getContratoTemplate(db: Firestore, id: string): Promise<ContratoTemplate> {
  const snap = await getDoc(doc(db, 'contrato_templates', id))
  if (!snap.exists()) throw new Error('ContratoTemplate not found')
  return toTemplate(snap.id, snap.data())
}

export async function listContratoTemplatesForServico(
  db: Firestore,
  servicoId: string,
): Promise<ContratoTemplate[]> {
  const [byServico, global] = await Promise.all([
    getDocs(query(collection(db, 'contrato_templates'), where('servico_id', '==', servicoId), orderBy('nome'))),
    getDocs(query(collection(db, 'contrato_templates'), where('servico_id', '==', null), orderBy('nome'))),
  ])
  const all = [
    ...byServico.docs.map((d) => toTemplate(d.id, d.data())),
    ...global.docs.map((d) => toTemplate(d.id, d.data())),
  ]
  return all.sort((a, b) => a.nome.localeCompare(b.nome))
}

export async function getContratoTemplateForServico(
  db: Firestore,
  servicoId: string,
): Promise<ContratoTemplate | null> {
  const byServico = await getDocs(
    query(collection(db, 'contrato_templates'), where('servico_id', '==', servicoId), limit(1)),
  )
  if (!byServico.empty) {
    const templateDoc = byServico.docs[0]!
    return toTemplate(templateDoc.id, templateDoc.data())
  }

  const defaultSnap = await getDocs(
    query(
      collection(db, 'contrato_templates'),
      where('servico_id', '==', null),
      where('is_default', '==', true),
      limit(1),
    ),
  )
  if (!defaultSnap.empty) {
    const templateDoc = defaultSnap.docs[0]!
    return toTemplate(templateDoc.id, templateDoc.data())
  }
  return null
}

export async function createContratoTemplate(
  db: Firestore,
  input: ContratoTemplateInsert,
): Promise<ContratoTemplate> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'contrato_templates'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toTemplate(snap.id, snap.data()!)
}

export async function updateContratoTemplate(
  db: Firestore,
  id: string,
  input: Partial<Omit<ContratoTemplateInsert, 'servico_id'>>,
): Promise<ContratoTemplate> {
  await updateDoc(doc(db, 'contrato_templates', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'contrato_templates', id))
  return toTemplate(snap.id, snap.data()!)
}

export async function deleteContratoTemplate(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'contrato_templates', id))
}
