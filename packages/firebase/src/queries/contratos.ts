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
  limit,
  type Firestore,
} from 'firebase/firestore'
import { getCliente } from './clientes'
import type { Contrato, ContratoInsert, ContratoWithCliente, StatusContrato } from '../types'

function toContrato(id: string, data: Record<string, unknown>): Contrato {
  return { id, ...data } as Contrato
}

export interface ContratoFilters {
  status?: StatusContrato
  cliente_id?: string
}

export async function listContratos(
  db: Firestore,
  clienteId?: string,
): Promise<Contrato[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('created_at', 'desc')]
  if (clienteId) constraints.push(where('cliente_id', '==', clienteId))
  const snap = await getDocs(query(collection(db, 'contratos'), ...constraints))
  return snap.docs.map((d) => toContrato(d.id, d.data()))
}

export async function getContrato(db: Firestore, id: string): Promise<Contrato> {
  const snap = await getDoc(doc(db, 'contratos', id))
  if (!snap.exists()) throw new Error('Contrato not found')
  return toContrato(snap.id, snap.data())
}

export async function createContrato(db: Firestore, input: ContratoInsert): Promise<Contrato> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'contratos'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toContrato(snap.id, snap.data()!)
}

export async function updateContratoStatus(
  db: Firestore,
  id: string,
  status: StatusContrato,
): Promise<void> {
  await updateDoc(doc(db, 'contratos', id), { status, updated_at: new Date().toISOString() })
}

export async function assinarContrato(
  db: Firestore,
  id: string,
  assinaturaUrl: string,
  ipAssinatura: string,
): Promise<void> {
  await updateDoc(doc(db, 'contratos', id), {
    status: 'assinado',
    assinatura_url: assinaturaUrl,
    ip_assinatura: ipAssinatura,
    assinado_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

export async function updateContratoPdfUrl(
  db: Firestore,
  id: string,
  pdfUrl: string,
): Promise<void> {
  await updateDoc(doc(db, 'contratos', id), { pdf_url: pdfUrl, updated_at: new Date().toISOString() })
}

export async function getContratoByProcesso(
  db: Firestore,
  processoId: string,
): Promise<Contrato | null> {
  const snap = await getDocs(
    query(
      collection(db, 'contratos'),
      where('processo_id', '==', processoId),
      where('aditivo_de', '==', null),
      limit(1),
    ),
  )
  if (snap.empty) return null
  return toContrato(snap.docs[0].id, snap.docs[0].data())
}

export async function listContratosByProcesso(
  db: Firestore,
  processoId: string,
): Promise<Contrato[]> {
  const snap = await getDocs(
    query(
      collection(db, 'contratos'),
      where('processo_id', '==', processoId),
      where('aditivo_de', '==', null),
      orderBy('created_at'),
    ),
  )
  return snap.docs.map((d) => toContrato(d.id, d.data()))
}

export async function listAditivosByContrato(
  db: Firestore,
  contratoId: string,
): Promise<Contrato[]> {
  const snap = await getDocs(
    query(
      collection(db, 'contratos'),
      where('aditivo_de', '==', contratoId),
      orderBy('created_at'),
    ),
  )
  return snap.docs.map((d) => toContrato(d.id, d.data()))
}

export async function listAditivosByProcesso(
  db: Firestore,
  processoId: string,
): Promise<Contrato[]> {
  const snap = await getDocs(
    query(
      collection(db, 'contratos'),
      where('processo_id', '==', processoId),
      orderBy('created_at'),
    ),
  )
  return snap.docs
    .map((d) => toContrato(d.id, d.data()))
    .filter((c) => c.aditivo_de !== null)
}

export async function listContratosWithClientes(
  db: Firestore,
  filters: ContratoFilters = {},
): Promise<ContratoWithCliente[]> {
  const contratos = await listContratos(db, filters.cliente_id)
  const filtered = filters.status ? contratos.filter((c) => c.status === filters.status) : contratos
  const clienteIds = [...new Set(filtered.map((c) => c.cliente_id))]
  const clientes = await Promise.all(clienteIds.map((cid) => getCliente(db, cid)))
  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c]))
  return filtered.map((c) => ({ ...c, cliente: clienteMap[c.cliente_id] ?? null }))
}

export async function enviarContrato(
  db: Firestore,
  id: string,
  enviadoPorId: string,
): Promise<void> {
  await updateDoc(doc(db, 'contratos', id), {
    status: 'enviado',
    enviado_por: enviadoPorId,
    updated_at: new Date().toISOString(),
  })
}

export async function updateContrato(
  db: Firestore,
  id: string,
  input: { titulo: string; corpo_html: string },
): Promise<void> {
  await updateDoc(doc(db, 'contratos', id), { ...input, updated_at: new Date().toISOString() })
}
