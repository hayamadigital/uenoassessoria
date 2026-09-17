import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import type { AcessoCliente, AcessoHistoricoEvento, AcessoModulo, AppConfigAcessos } from '../types'

const ACESSOS_CONFIG_ID = 'acessos'

function toAcessoModulo(data: Record<string, unknown> | undefined): AcessoModulo {
  const habilitado = data?.habilitado === true
  const expiraEmRaw = data?.expira_em
  // Stored as a native Timestamp so firestore.rules can compare it against request.time.
  const expiraEm = expiraEmRaw instanceof Timestamp
    ? expiraEmRaw.toDate().toISOString()
    : typeof expiraEmRaw === 'string' ? expiraEmRaw : null
  return { habilitado, expira_em: expiraEm }
}

function toAppConfigAcessos(data: Record<string, unknown>): AppConfigAcessos {
  return {
    estudos_disponivel: data.estudos_disponivel === true,
    catalogo_disponivel: data.catalogo_disponivel === true,
    revision: typeof data.revision === 'number' ? data.revision : 0,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    updated_by: typeof data.updated_by === 'string' ? data.updated_by : null,
  }
}

function toAcessoCliente(uid: string, data: Record<string, unknown>): AcessoCliente {
  return {
    cliente_id: typeof data.cliente_id === 'string' ? data.cliente_id : uid,
    estudos: toAcessoModulo(data.estudos as Record<string, unknown> | undefined),
    catalogo: toAcessoModulo(data.catalogo as Record<string, unknown> | undefined),
    revision: typeof data.revision === 'number' ? data.revision : 0,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    updated_by: typeof data.updated_by === 'string' ? data.updated_by : null,
  }
}

function toAcessoHistoricoEvento(id: string, data: Record<string, unknown>): AcessoHistoricoEvento {
  return {
    id,
    modulo: data.modulo === 'catalogo' ? 'catalogo' : 'estudos',
    valores_anteriores: (data.valores_anteriores as Record<string, unknown> | null) ?? null,
    valores_novos: (data.valores_novos as Record<string, unknown>) ?? {},
    motivo: typeof data.motivo === 'string' ? data.motivo : '',
    admin_id: typeof data.admin_id === 'string' ? data.admin_id : '',
    operation_id: typeof data.operation_id === 'string' ? data.operation_id : id,
    created_at: typeof data.created_at === 'string' ? data.created_at : null,
  }
}

export async function getAppConfigAcessos(db: Firestore): Promise<AppConfigAcessos | null> {
  const snap = await getDoc(doc(db, 'app_config', ACESSOS_CONFIG_ID))
  return snap.exists() ? toAppConfigAcessos(snap.data()) : null
}

export function subscribeAppConfigAcessos(
  db: Firestore,
  onChange: (config: AppConfigAcessos | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'app_config', ACESSOS_CONFIG_ID),
    (snap) => onChange(snap.exists() ? toAppConfigAcessos(snap.data()) : null),
    onError,
  )
}

export async function getAcessoCliente(db: Firestore, uid: string): Promise<AcessoCliente | null> {
  const snap = await getDoc(doc(db, 'acessos_clientes', uid))
  return snap.exists() ? toAcessoCliente(uid, snap.data()) : null
}

export function subscribeAcessoCliente(
  db: Firestore,
  uid: string,
  onChange: (acesso: AcessoCliente | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'acessos_clientes', uid),
    (snap) => onChange(snap.exists() ? toAcessoCliente(uid, snap.data()) : null),
    onError,
  )
}

export async function listAcessoClienteHistorico(db: Firestore, uid: string): Promise<AcessoHistoricoEvento[]> {
  const snap = await getDocs(
    query(collection(db, 'acessos_clientes', uid, 'historico'), orderBy('created_at', 'desc')),
  )
  return snap.docs.map((d) => toAcessoHistoricoEvento(d.id, d.data()))
}

export async function listAppConfigAcessosHistorico(db: Firestore): Promise<AcessoHistoricoEvento[]> {
  const snap = await getDocs(
    query(collection(db, 'app_config', ACESSOS_CONFIG_ID, 'historico'), orderBy('created_at', 'desc')),
  )
  return snap.docs.map((d) => toAcessoHistoricoEvento(d.id, d.data()))
}
