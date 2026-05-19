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
import type { Cliente, ClienteInsert, ClienteWithProfile, StatusProcesso } from '../types'

function toCliente(id: string, data: Record<string, unknown>): Cliente {
  return { id, ...data } as Cliente
}

export interface ClienteFilters {
  status?: StatusProcesso
  instrutor_id?: string
  search?: string
}

export async function listClientes(
  db: Firestore,
  filters: ClienteFilters = {},
): Promise<ClienteWithProfile[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('created_at', 'desc')]

  if (filters.status) constraints.push(where('status_processo', '==', filters.status))
  if (filters.instrutor_id) constraints.push(where('assigned_instrutor_id', '==', filters.instrutor_id))

  const snap = await getDocs(query(collection(db, 'clientes'), ...constraints))
  const clientes = snap.docs.map((d) => toCliente(d.id, d.data()))

  // Fetch profiles in parallel
  const profiles = await Promise.all(clientes.map((c) => getProfile(db, c.profile_id)))
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))

  return clientes
    .filter((c) => {
      if (filters.search) {
        const nome = profileMap[c.profile_id]?.full_name?.toLowerCase() ?? ''
        return nome.includes(filters.search!.toLowerCase()) || (c.cpf ?? '').includes(filters.search!)
      }
      return true
    })
    .map((c) => ({ ...c, profile: profileMap[c.profile_id]! }))
}

export async function getCliente(db: Firestore, id: string): Promise<ClienteWithProfile> {
  const snap = await getDoc(doc(db, 'clientes', id))
  if (!snap.exists()) throw new Error('Cliente not found')
  const cliente = toCliente(snap.id, snap.data())
  const profile = await getProfile(db, cliente.profile_id)
  return { ...cliente, profile }
}

export async function getClienteByProfileId(
  db: Firestore,
  profileId: string,
): Promise<ClienteWithProfile> {
  const snap = await getDocs(
    query(collection(db, 'clientes'), where('profile_id', '==', profileId)),
  )
  if (snap.empty) throw new Error('Cliente not found')
  const clienteDoc = snap.docs[0]!
  const cliente = toCliente(clienteDoc.id, clienteDoc.data())
  const profile = await getProfile(db, cliente.profile_id)
  return { ...cliente, profile }
}

export async function createCliente(db: Firestore, input: ClienteInsert): Promise<Cliente> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'clientes'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toCliente(snap.id, snap.data()!)
}

export async function updateCliente(
  db: Firestore,
  id: string,
  input: Partial<ClienteInsert>,
): Promise<Cliente> {
  await updateDoc(doc(db, 'clientes', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'clientes', id))
  return toCliente(snap.id, snap.data()!)
}

export async function updateClienteStatus(
  db: Firestore,
  id: string,
  status: StatusProcesso,
): Promise<void> {
  await updateDoc(doc(db, 'clientes', id), {
    status_processo: status,
    updated_at: new Date().toISOString(),
  })
}
