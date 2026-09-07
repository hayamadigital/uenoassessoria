import { getFunctions, httpsCallable } from 'firebase/functions'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import type { Profile, ProfileInsert, UserRole } from '../types'

function toProfile(id: string, data: Record<string, unknown>): Profile {
  return { id, ...data } as Profile
}

export async function getProfile(db: Firestore, userId: string): Promise<Profile> {
  try {
    const snap = await getDoc(doc(db, 'users', userId))
    if (!snap.exists()) throw new Error('Perfil indisponível')
    return toProfile(snap.id, snap.data())
  } catch (error) {
    if ((error as { code?: string }).code !== 'permission-denied') throw error
    const resolve = httpsCallable<{ uid: string }, Profile>(getFunctions(db.app), 'getAssignedClientProfile')
    return (await resolve({ uid: userId })).data
  }
}

export async function listProfiles(db: Firestore, role?: UserRole): Promise<Profile[]> {
  const ref = collection(db, 'users')
  const constraints = role
    ? [where('role', '==', role), orderBy('full_name')]
    : [orderBy('full_name')]
  const snap = await getDocs(query(ref, ...constraints))
  return snap.docs.map((d) => toProfile(d.id, d.data()))
}

export async function listInstrutores(db: Firestore): Promise<Profile[]> {
  return listProfiles(db, 'instrutor')
}

export async function listAdminsEInstrutores(db: Firestore): Promise<Profile[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('role', 'in', ['admin', 'instrutor']),
      where('is_active', '==', true),
      orderBy('full_name'),
    ),
  )
  return snap.docs.map((d) => toProfile(d.id, d.data()))
}

export async function listStaffProfiles(db: Firestore): Promise<Profile[]> {
  const [admins, instrutores] = await Promise.all([
    listProfiles(db, 'admin'),
    listProfiles(db, 'instrutor'),
  ])
  return [...admins, ...instrutores].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, 'pt-BR'),
  )
}

export async function upsertProfile(db: Firestore, input: ProfileInsert): Promise<Profile> {
  const now = new Date().toISOString()
  const raw = { ...input, updated_at: now, created_at: now }
  const data = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined))
  await setDoc(doc(db, 'users', input.id), data, { merge: true })
  return { ...raw, id: input.id } as Profile
}

export async function updateProfile(
  db: Firestore,
  id: string,
  input: Partial<ProfileInsert>,
): Promise<Profile> {
  const now = new Date().toISOString()
  await updateDoc(doc(db, 'users', id), { ...input, updated_at: now })
  return getProfile(db, id)
}
