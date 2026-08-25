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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { FirebaseStorage } from 'firebase/storage'
import { getProfile } from './perfis'
import type {
  ClienteDocumento,
  ClienteDocumentoInsert,
  ClienteDocumentoWithTemplate,
  ClienteDocumentoWithTemplateAndCliente,
  DocumentoTemplate,
  DocumentoTemplateInsert,
  StatusDocumento,
} from '../types'

function toDocumento(id: string, data: Record<string, unknown>): ClienteDocumento {
  return { id, ...data } as ClienteDocumento
}

function toDocumentoTemplate(id: string, data: Record<string, unknown>): DocumentoTemplate {
  const legacyVariacaoId = typeof data.variacao_id === 'string' ? data.variacao_id : null
  const variacaoIds = Array.isArray(data.variacao_ids)
    ? data.variacao_ids as string[]
    : legacyVariacaoId
      ? [legacyVariacaoId]
      : []
  return { id, ...data, variacao_id: legacyVariacaoId, variacao_ids: variacaoIds } as DocumentoTemplate
}

export async function listDocumentoTemplates(db: Firestore): Promise<DocumentoTemplate[]> {
  const snap = await getDocs(
    query(collection(db, 'documento_templates'), orderBy('ordem')),
  )
  return snap.docs.map((d) => toDocumentoTemplate(d.id, d.data()))
}

export async function listDocumentoTemplatesByServico(
  db: Firestore,
  servicoId: string,
  variacaoId?: string | null,
): Promise<DocumentoTemplate[]> {
  const templates = await listDocumentoTemplates(db)
  return templates.filter((template) => {
    if (template.servico_id !== servicoId) return false
    const variacaoIds = template.variacao_ids.length > 0
      ? template.variacao_ids
      : template.variacao_id
        ? [template.variacao_id]
        : []
    if (!variacaoId) return variacaoIds.length === 0
    return variacaoIds.length === 0 || variacaoIds.includes(variacaoId)
  })
}

export async function createDocumentoTemplate(
  db: Firestore,
  input: DocumentoTemplateInsert,
): Promise<DocumentoTemplate> {
  const ref = await addDoc(collection(db, 'documento_templates'), {
    ...input,
    variacao_ids: input.variacao_ids ?? [],
    variacao_id: input.variacao_id ?? null,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return toDocumentoTemplate(snap.id, snap.data()!)
}

export async function updateDocumentoTemplate(
  db: Firestore,
  id: string,
  input: Partial<DocumentoTemplateInsert>,
): Promise<void> {
  await updateDoc(doc(db, 'documento_templates', id), input)
}

export async function deleteDocumentoTemplate(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'documento_templates', id))
}

export async function getClienteDocumentos(
  db: Firestore,
  clienteId: string,
): Promise<ClienteDocumentoWithTemplate[]> {
  const snap = await getDocs(
    query(
      collection(db, 'clientes', clienteId, 'documentos'),
      orderBy('created_at'),
    ),
  )

  const documentos = snap.docs.map((d) => toDocumento(d.id, d.data()))

  // Fetch templates in parallel
  const templateIds = [...new Set(documentos.map((d) => d.template_id).filter(Boolean))]
  const templateSnaps = await Promise.all(
    templateIds.map((tid) => getDoc(doc(db, 'documento_templates', tid!))),
  )
  const templateMap = Object.fromEntries(
    templateSnaps.filter((s) => s.exists()).map((s) => [s.id, toDocumentoTemplate(s.id, s.data()!)]),
  )

  return documentos.map((d) => ({
    ...d,
    template: d.template_id ? (templateMap[d.template_id] ?? null) : null,
  }))
}

export async function createClienteDocumento(
  db: Firestore,
  input: ClienteDocumentoInsert,
): Promise<ClienteDocumento> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'clientes', input.cliente_id, 'documentos'), {
    ...input,
    created_at: now,
    updated_at: now,
  })
  const snap = await getDoc(ref)
  return toDocumento(snap.id, snap.data()!)
}

export async function updateDocumentoStatus(
  db: Firestore,
  clienteId: string,
  id: string,
  status: StatusDocumento,
  revisorId: string,
  observacao?: string,
): Promise<void> {
  await updateDoc(doc(db, 'clientes', clienteId, 'documentos', id), {
    status,
    revisado_por: revisorId,
    revisado_em: new Date().toISOString(),
    observacao: observacao ?? null,
    updated_at: new Date().toISOString(),
  })
}

export async function uploadDocumento(
  storage: FirebaseStorage,
  clienteId: string,
  file: File | Blob,
  fileName: string,
): Promise<string> {
  const path = `documentos/${clienteId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return path
}

export async function getDocumentoSignedUrl(
  storage: FirebaseStorage,
  path: string,
): Promise<string> {
  return getDownloadURL(ref(storage, path))
}

export async function listPendingDocumentos(
  db: Firestore,
): Promise<ClienteDocumentoWithTemplate[]> {
  // Firestore collection group query across all clients
  const { collectionGroup } = await import('firebase/firestore')
  const snap = await getDocs(
    query(
      collectionGroup(db, 'documentos'),
      where('status', '==', 'enviado'),
      orderBy('created_at'),
    ),
  )

  const documentos = snap.docs.map((d) => toDocumento(d.id, d.data()))

  const templateIds = [...new Set(documentos.map((d) => d.template_id).filter(Boolean))]
  const templateSnaps = await Promise.all(
    templateIds.map((tid) => getDoc(doc(db, 'documento_templates', tid!))),
  )
  const templateMap = Object.fromEntries(
    templateSnaps.filter((s) => s.exists()).map((s) => [s.id, toDocumentoTemplate(s.id, s.data()!)]),
  )

  return documentos.map((d) => ({
    ...d,
    template: d.template_id ? (templateMap[d.template_id] ?? null) : null,
  }))
}

export async function listPendingDocumentosWithClientes(
  db: Firestore,
): Promise<ClienteDocumentoWithTemplateAndCliente[]> {
  const documentos = await listPendingDocumentos(db)

  const clienteIds = [...new Set(documentos.map((d) => d.cliente_id))]
  const clienteSnaps = await Promise.all(clienteIds.map((cid) => getDoc(doc(db, 'clientes', cid))))

  const clienteMap: Record<string, { id: string; profile_id: string }> = {}
  const profileFetches: Promise<void>[] = []

  for (const snap of clienteSnaps) {
    if (snap.exists()) {
      const data = snap.data() as { profile_id: string }
      clienteMap[snap.id] = { id: snap.id, profile_id: data.profile_id }
    }
  }

  const profileIds = Object.values(clienteMap).map((c) => c.profile_id)
  const profiles = await Promise.all(profileIds.map((pid) => getProfile(db, pid)))
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))

  return documentos.map((d) => {
    const clienteData = clienteMap[d.cliente_id]
    const profile = clienteData ? profileMap[clienteData.profile_id] : undefined
    return {
      ...d,
      cliente: clienteData && profile
        ? { id: clienteData.id, profile }
        : null,
    }
  })
}
