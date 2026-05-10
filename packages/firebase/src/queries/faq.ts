import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import type { FAQ, FAQInsert } from '../types'

export async function listFaqs(db: Firestore): Promise<FAQ[]> {
  const snap = await getDocs(query(collection(db, 'faq'), orderBy('ordem')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FAQ)
}

export async function createFaq(db: Firestore, input: FAQInsert): Promise<FAQ> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'faq'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return { id: snap.id, ...snap.data() } as FAQ
}

export async function updateFaq(
  db: Firestore,
  id: string,
  input: Partial<FAQInsert>,
): Promise<FAQ> {
  await updateDoc(doc(db, 'faq', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'faq', id))
  return { id: snap.id, ...snap.data() } as FAQ
}

export async function deleteFaq(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'faq', id))
}
