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
import type { Aviso, AvisoInsert, StatusAviso } from '../types'

function toAviso(id: string, data: Record<string, unknown>): Aviso {
  const conteudoTipo = data.conteudo_tipo === 'imagens' ? 'imagens' : 'texto'
  return {
    id,
    descricao: typeof data.descricao === 'string' ? data.descricao : '',
    conteudo_tipo: conteudoTipo,
    banner_url: typeof data.banner_url === 'string' ? data.banner_url : '',
    imagens_layout: data.imagens_layout === 'lista'
      ? 'lista'
      : conteudoTipo === 'imagens'
        ? 'lista'
        : 'carrossel',
    pdf_url: typeof data.pdf_url === 'string' ? data.pdf_url : null,
    imagens_carrossel: Array.isArray(data.imagens_carrossel)
      ? data.imagens_carrossel.filter((item): item is string => typeof item === 'string')
      : [],
    tipo: data.tipo as Aviso['tipo'],
    titulo: typeof data.titulo === 'string' ? data.titulo : '',
    data_publicacao: typeof data.data_publicacao === 'string' ? data.data_publicacao : '',
    data_encerramento: typeof data.data_encerramento === 'string' ? data.data_encerramento : '',
    broadcast: Boolean(data.broadcast),
    tipos_processo: Array.isArray(data.tipos_processo)
      ? data.tipos_processo.filter((item): item is string => typeof item === 'string')
      : [],
    created_at: typeof data.created_at === 'string' ? data.created_at : '',
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : '',
    created_by: typeof data.created_by === 'string' ? data.created_by : '',
  }
}

export function computeStatusAviso(aviso: Aviso): StatusAviso {
  const now = new Date().toISOString()
  if (aviso.data_publicacao > now) return 'agendado'
  if (aviso.data_encerramento >= now) return 'ativo'
  return 'encerrado'
}

export async function listAvisos(db: Firestore): Promise<Aviso[]> {
  const snap = await getDocs(
    query(collection(db, 'avisos'), orderBy('data_publicacao', 'desc')),
  )
  return snap.docs.map((d) => toAviso(d.id, d.data()))
}

export async function listAvisosAtivos(
  db: Firestore,
  tipoProcesso?: string,
): Promise<Aviso[]> {
  const now = new Date().toISOString()
  const snap = await getDocs(
    query(collection(db, 'avisos'), orderBy('data_publicacao', 'desc')),
  )
  return snap.docs
    .map((d) => toAviso(d.id, d.data()))
    .filter((a) => a.data_publicacao <= now && a.data_encerramento >= now)
}

export function subscribeAvisosAtivos(
  db: Firestore,
  onChange: (avisos: Aviso[]) => void,
  tipoProcesso?: string,
): Unsubscribe {
  const now = new Date().toISOString()
  return onSnapshot(
    query(collection(db, 'avisos'), orderBy('data_publicacao', 'desc')),
    (snap) => {
      onChange(
        snap.docs
          .map((d) => toAviso(d.id, d.data()))
          .filter((a) => a.data_publicacao <= now && a.data_encerramento >= now),
      )
    },
  )
}

export async function getAviso(db: Firestore, id: string): Promise<Aviso | null> {
  const snap = await getDoc(doc(db, 'avisos', id))
  if (!snap.exists()) return null
  return toAviso(snap.id, snap.data())
}

export async function createAviso(db: Firestore, input: AvisoInsert): Promise<Aviso> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'avisos'), {
    ...input,
    created_at: now,
    updated_at: now,
  })
  const snap = await getDoc(ref)
  return toAviso(snap.id, snap.data()!)
}

export async function updateAviso(
  db: Firestore,
  id: string,
  input: Partial<AvisoInsert>,
): Promise<Aviso> {
  const ref = doc(db, 'avisos', id)
  await updateDoc(ref, { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(ref)
  return toAviso(snap.id, snap.data()!)
}

export async function deleteAviso(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'avisos', id))
}
