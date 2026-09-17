import { createHash } from 'node:crypto'
import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'

export type ModuloAcesso = 'estudos' | 'catalogo'

export function validateModulo(value: unknown): ModuloAcesso {
  if (value !== 'estudos' && value !== 'catalogo') {
    throw new HttpsError('invalid-argument', 'modulo desconhecido')
  }
  return value
}

function requiredNonEmptyString(value: unknown, field: string, minLength: number, maxLength: number) {
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', `${field} é inválido`)
  const trimmed = value.trim()
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} é inválido`)
  }
  return trimmed
}

function validExpiraEm(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', 'expira_em é inválido')
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new HttpsError('invalid-argument', 'expira_em é inválido')
  if (date.getTime() <= Date.now()) throw new HttpsError('invalid-argument', 'expira_em precisa ser uma data futura')
  return date.toISOString()
}

function validRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new HttpsError('invalid-argument', 'expected_revision é inválido')
  }
  return value
}

function validOperationId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(value)) {
    throw new HttpsError('invalid-argument', 'operation_id é inválido')
  }
  return value
}

function rejectExtraKeys(payload: Record<string, unknown>, allowed: readonly string[]) {
  const extra = Object.keys(payload).filter((key) => !allowed.includes(key))
  if (extra.length > 0) throw new HttpsError('invalid-argument', `Campos não permitidos: ${extra.join(', ')}`)
}

export interface SetAcessoInput {
  cliente_id: string
  modulo: ModuloAcesso
  habilitado: boolean
  expira_em: string | null
  motivo: string
  expected_revision: number
  operation_id: string
}

const SET_ACESSO_KEYS = ['cliente_id', 'modulo', 'habilitado', 'expira_em', 'motivo', 'expected_revision', 'operation_id'] as const

export function validateSetAcessoInput(data: Record<string, unknown> | undefined): SetAcessoInput {
  const payload = data ?? {}
  rejectExtraKeys(payload, SET_ACESSO_KEYS)
  if (typeof payload.habilitado !== 'boolean') throw new HttpsError('invalid-argument', 'habilitado deve ser booleano')
  return {
    cliente_id: requiredNonEmptyString(payload.cliente_id, 'cliente_id', 1, 128),
    modulo: validateModulo(payload.modulo),
    habilitado: payload.habilitado,
    expira_em: validExpiraEm(payload.expira_em),
    motivo: requiredNonEmptyString(payload.motivo, 'motivo', 5, 500),
    expected_revision: validRevision(payload.expected_revision),
    operation_id: validOperationId(payload.operation_id),
  }
}

export interface SetAvailabilityInput {
  modulo: ModuloAcesso
  disponivel: boolean
  motivo: string
  expected_revision: number
  operation_id: string
}

const SET_AVAILABILITY_KEYS = ['modulo', 'disponivel', 'motivo', 'expected_revision', 'operation_id'] as const

export function validateSetAvailabilityInput(data: Record<string, unknown> | undefined): SetAvailabilityInput {
  const payload = data ?? {}
  rejectExtraKeys(payload, SET_AVAILABILITY_KEYS)
  if (typeof payload.disponivel !== 'boolean') throw new HttpsError('invalid-argument', 'disponivel deve ser booleano')
  return {
    modulo: validateModulo(payload.modulo),
    disponivel: payload.disponivel,
    motivo: requiredNonEmptyString(payload.motivo, 'motivo', 5, 500),
    expected_revision: validRevision(payload.expected_revision),
    operation_id: validOperationId(payload.operation_id),
  }
}

function operationHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

// Grants/revokes one module for one client. Idempotent by operation_id (same payload
// short-circuits without rewriting anything); optimistic-locked by expected_revision.
export async function applySetClienteModuleAccess(
  db: Firestore,
  input: SetAcessoInput,
  adminUid: string,
): Promise<{ revision: number }> {
  const clienteSnap = await db.collection('clientes').doc(input.cliente_id).get()
  if (!clienteSnap.exists) throw new HttpsError('not-found', 'Cliente não encontrado')
  const uid = clienteSnap.data()?.profile_id as string | undefined
  if (!uid) throw new HttpsError('failed-precondition', 'Cliente sem vínculo de perfil válido')

  const acessoRef = db.collection('acessos_clientes').doc(uid)
  const opRef = db.collection('_operations').doc(input.operation_id)
  const hash = operationHash({ type: 'setClienteModuleAccess', uid, ...input })

  return db.runTransaction(async (tx) => {
    const opSnap = await tx.get(opRef)
    if (opSnap.exists) {
      if (opSnap.data()?.payload_hash !== hash) {
        throw new HttpsError('already-exists', 'operation_id já foi usado com outro payload')
      }
      const current = await tx.get(acessoRef)
      return { revision: (current.data()?.revision as number) ?? 0 }
    }

    const acessoSnap = await tx.get(acessoRef)
    const current = acessoSnap.exists ? acessoSnap.data()! : null
    const currentRevision = (current?.revision as number) ?? 0
    if (currentRevision !== input.expected_revision) {
      throw new HttpsError('aborted', 'Revisão divergente, recarregue a tela')
    }

    const previousModulo = current?.[input.modulo] ?? null
    // Native Timestamp (not the validated ISO string) so firestore.rules can compare
    // against request.time when gating reads of the module's content.
    const novoModulo = {
      habilitado: input.habilitado,
      expira_em: input.expira_em ? Timestamp.fromDate(new Date(input.expira_em)) : null,
    }
    const outroModulo: ModuloAcesso = input.modulo === 'estudos' ? 'catalogo' : 'estudos'
    // Keep both module keys always present so rules never have to special-case a missing map key.
    const outroModuloAtual = current?.[outroModulo] ?? { habilitado: false, expira_em: null }
    const nextRevision = currentRevision + 1
    const now = new Date().toISOString()

    tx.set(acessoRef, {
      cliente_id: input.cliente_id,
      [input.modulo]: novoModulo,
      [outroModulo]: outroModuloAtual,
      revision: nextRevision,
      updated_at: now,
      updated_by: adminUid,
    }, { merge: true })

    tx.set(acessoRef.collection('historico').doc(input.operation_id), {
      modulo: input.modulo,
      valores_anteriores: previousModulo,
      valores_novos: novoModulo,
      motivo: input.motivo,
      admin_id: adminUid,
      operation_id: input.operation_id,
      created_at: now,
    })

    tx.set(opRef, { payload_hash: hash, created_at: now })

    return { revision: nextRevision }
  })
}

// Toggles global module availability. Same idempotency/concurrency mechanics as above.
export async function applySetClientModuleAvailability(
  db: Firestore,
  input: SetAvailabilityInput,
  adminUid: string,
): Promise<{ revision: number }> {
  const configRef = db.collection('app_config').doc('acessos')
  const opRef = db.collection('_operations').doc(input.operation_id)
  const hash = operationHash({ type: 'setClientModuleAvailability', ...input })

  return db.runTransaction(async (tx) => {
    const opSnap = await tx.get(opRef)
    if (opSnap.exists) {
      if (opSnap.data()?.payload_hash !== hash) {
        throw new HttpsError('already-exists', 'operation_id já foi usado com outro payload')
      }
      const current = await tx.get(configRef)
      return { revision: (current.data()?.revision as number) ?? 0 }
    }

    const configSnap = await tx.get(configRef)
    const current = configSnap.exists ? configSnap.data()! : null
    const currentRevision = (current?.revision as number) ?? 0
    if (currentRevision !== input.expected_revision) {
      throw new HttpsError('aborted', 'Revisão divergente, recarregue a tela')
    }

    const field = input.modulo === 'estudos' ? 'estudos_disponivel' : 'catalogo_disponivel'
    const previousValue = current?.[field] ?? false
    const nextRevision = currentRevision + 1
    const now = new Date().toISOString()

    tx.set(configRef, {
      [field]: input.disponivel,
      revision: nextRevision,
      updated_at: now,
      updated_by: adminUid,
    }, { merge: true })

    tx.set(configRef.collection('historico').doc(input.operation_id), {
      modulo: input.modulo,
      valores_anteriores: { disponivel: previousValue },
      valores_novos: { disponivel: input.disponivel },
      motivo: input.motivo,
      admin_id: adminUid,
      operation_id: input.operation_id,
      created_at: now,
    })

    tx.set(opRef, { payload_hash: hash, created_at: now })

    return { revision: nextRevision }
  })
}
