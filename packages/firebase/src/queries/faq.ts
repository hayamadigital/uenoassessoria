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
import type { FAQ, FAQInsert } from '../types'

const DEFAULT_ICON = 'HelpCircle'
const DEFAULT_COLOR = '#6B46C1'

function normalizeFaq(id: string, data: Record<string, unknown>, index = 0): FAQ {
  const createdAt = typeof data.created_at === 'string' ? data.created_at : ''
  const updatedAt = typeof data.updated_at === 'string' ? data.updated_at : createdAt

  return {
    id,
    pergunta:
      typeof data.pergunta === 'string'
        ? data.pergunta
        : typeof data.q === 'string'
          ? data.q
          : typeof data.question === 'string'
            ? data.question
            : '',
    resposta:
      typeof data.resposta === 'string'
        ? data.resposta
        : typeof data.a === 'string'
          ? data.a
          : typeof data.answer === 'string'
            ? data.answer
            : '',
    cor_icone: typeof data.cor_icone === 'string' ? data.cor_icone : DEFAULT_COLOR,
    icone: typeof data.icone === 'string' ? data.icone : DEFAULT_ICON,
    is_active: typeof data.is_active === 'boolean' ? data.is_active : true,
    ordem: typeof data.ordem === 'number' ? data.ordem : index,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export async function listFaqs(db: Firestore): Promise<FAQ[]> {
  const snap = await getDocs(collection(db, 'faq'))
  return snap.docs
    .map((d, index) => normalizeFaq(d.id, d.data(), index))
    .sort((a, b) => a.ordem - b.ordem)
}

export async function createFaq(db: Firestore, input: FAQInsert): Promise<FAQ> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'faq'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return normalizeFaq(snap.id, snap.data() ?? {})
}

export async function updateFaq(
  db: Firestore,
  id: string,
  input: Partial<FAQInsert>,
): Promise<FAQ> {
  await updateDoc(doc(db, 'faq', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'faq', id))
  return normalizeFaq(snap.id, snap.data() ?? {})
}

export async function deleteFaq(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'faq', id))
}
