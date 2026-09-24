import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  type Unsubscribe,
  type Firestore,
} from 'firebase/firestore'
import type { CategoriaFaq, CategoriaFaqInsert, FAQ, FAQInsert } from '../types'

const DEFAULT_ICON = 'HelpCircle'
const DEFAULT_COLOR = '#6B46C1'

function normalizeFaq(id: string, data: Record<string, unknown>, index = 0): FAQ {
  const createdAt = typeof data.created_at === 'string' ? data.created_at : ''
  const updatedAt = typeof data.updated_at === 'string' ? data.updated_at : createdAt

  return {
    id,
    categoria_id: typeof data.categoria_id === 'string' ? data.categoria_id : null,
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

export function subscribeFaqs(db: Firestore, onChange: (faqs: FAQ[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'faq'), (snap) => {
    onChange(
      snap.docs
        .map((d, index) => normalizeFaq(d.id, d.data(), index))
        .sort((a, b) => a.ordem - b.ordem),
    )
  })
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

export async function reorderFaqs(
  db: Firestore,
  updates: Array<{ id: string; ordem: number }>,
): Promise<void> {
  await Promise.all(updates.map((u) => updateDoc(doc(db, 'faq', u.id), { ordem: u.ordem })))
}

// ─────────────────────────────────────────────
// Categorias de FAQ
// ─────────────────────────────────────────────

function normalizeCategoriaFaq(id: string, data: Record<string, unknown>): CategoriaFaq {
  return {
    id,
    nome: typeof data.nome === 'string' ? data.nome : '',
    descricao: typeof data.descricao === 'string' ? data.descricao : null,
    ordem: typeof data.ordem === 'number' ? data.ordem : 0,
    created_at: typeof data.created_at === 'string' ? data.created_at : '',
  }
}

export async function listCategoriasFaq(db: Firestore): Promise<CategoriaFaq[]> {
  const snap = await getDocs(query(collection(db, 'categorias_faq'), orderBy('ordem')))
  return snap.docs.map((d) => normalizeCategoriaFaq(d.id, d.data()))
}

export function subscribeCategoriasFaq(
  db: Firestore,
  onChange: (categorias: CategoriaFaq[]) => void,
): Unsubscribe {
  return onSnapshot(query(collection(db, 'categorias_faq'), orderBy('ordem')), (snap) => {
    onChange(snap.docs.map((d) => normalizeCategoriaFaq(d.id, d.data())))
  })
}

export async function createCategoriaFaq(
  db: Firestore,
  input: CategoriaFaqInsert,
): Promise<CategoriaFaq> {
  const ref = await addDoc(collection(db, 'categorias_faq'), {
    ...input,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return normalizeCategoriaFaq(snap.id, snap.data() ?? {})
}

export async function updateCategoriaFaq(
  db: Firestore,
  id: string,
  input: Partial<CategoriaFaqInsert>,
): Promise<CategoriaFaq> {
  await updateDoc(doc(db, 'categorias_faq', id), input)
  const snap = await getDoc(doc(db, 'categorias_faq', id))
  return normalizeCategoriaFaq(snap.id, snap.data() ?? {})
}

export async function deleteCategoriaFaq(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'categorias_faq', id))
}

export async function reorderCategoriasFaq(
  db: Firestore,
  updates: Array<{ id: string; ordem: number }>,
): Promise<void> {
  await Promise.all(updates.map((u) => updateDoc(doc(db, 'categorias_faq', u.id), { ordem: u.ordem })))
}
