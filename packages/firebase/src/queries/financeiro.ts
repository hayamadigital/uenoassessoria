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
import { getCliente } from './clientes'
import { getProfile } from './perfis'
import type {
  Pagamento,
  PagamentoInsert,
  PagamentoWithCliente,
  Parcela,
  ParcelaInsert,
  StatusPagamento,
  StatusParcela,
  Profile,
  Gasto,
  GastoInsert,
  FinalidadeGasto,
} from '../types'

export interface PagamentoFilters {
  cliente_id?: string
  status?: StatusPagamento
  data_inicio?: string
  data_fim?: string
}

export interface DashboardFinanceiro {
  total_pago_mes: number
  total_pendente: number
  total_cancelado: number
  quantidade_pagamentos: number
}

function toPagamento(id: string, data: Record<string, unknown>): Pagamento {
  return { id, ...data } as Pagamento
}

function toParcela(id: string, data: Record<string, unknown>): Parcela {
  return { id, ...data } as Parcela
}

export async function listPagamentos(
  db: Firestore,
  filters: PagamentoFilters = {},
): Promise<Pagamento[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('created_at', 'desc')]

  if (filters.cliente_id) constraints.push(where('cliente_id', '==', filters.cliente_id))
  if (filters.status) constraints.push(where('status', '==', filters.status))
  if (filters.data_inicio) constraints.push(where('created_at', '>=', filters.data_inicio))
  if (filters.data_fim) constraints.push(where('created_at', '<=', filters.data_fim))

  const snap = await getDocs(query(collection(db, 'pagamentos'), ...constraints))
  return snap.docs.map((d) => toPagamento(d.id, d.data()))
}

export async function createPagamento(db: Firestore, input: PagamentoInsert): Promise<Pagamento> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'pagamentos'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toPagamento(snap.id, snap.data()!)
}

export async function updatePagamentoStatus(
  db: Firestore,
  id: string,
  status: StatusPagamento,
  dataPagamento?: string,
): Promise<void> {
  await updateDoc(doc(db, 'pagamentos', id), {
    status,
    data_pagamento: dataPagamento ?? null,
    updated_at: new Date().toISOString(),
  })
}

export async function getDashboardFinanceiro(
  db: Firestore,
  mes: string, // YYYY-MM
): Promise<DashboardFinanceiro> {
  const inicio = `${mes}-01`
  const nextMonth = new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1))
  const fim = nextMonth.toISOString().slice(0, 10)

  const snap = await getDocs(
    query(
      collection(db, 'pagamentos'),
      where('created_at', '>=', inicio),
      where('created_at', '<', fim),
    ),
  )

  const rows = snap.docs.map((d) => d.data() as { status: StatusPagamento; valor_jpy: number })

  return {
    total_pago_mes: rows.filter((r) => r.status === 'pago').reduce((acc, r) => acc + r.valor_jpy, 0),
    total_pendente: rows.filter((r) => r.status === 'pendente').reduce((acc, r) => acc + r.valor_jpy, 0),
    total_cancelado: rows.filter((r) => r.status === 'cancelado').reduce((acc, r) => acc + r.valor_jpy, 0),
    quantidade_pagamentos: rows.length,
  }
}

export async function listPagamentosWithClientes(
  db: Firestore,
  filters: PagamentoFilters = {},
): Promise<PagamentoWithCliente[]> {
  const pagamentos = await listPagamentos(db, filters)
  const clienteIds = [...new Set(pagamentos.map((p) => p.cliente_id))]
  const clientes = await Promise.all(clienteIds.map((cid) => getCliente(db, cid)))
  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c]))
  return pagamentos.map((p) => ({ ...p, cliente: clienteMap[p.cliente_id]! }))
}

// ── Parcelas ───────────────────────────────────────────────────────

export async function listParcelas(db: Firestore, pagamentoId: string): Promise<Parcela[]> {
  const snap = await getDocs(
    query(
      collection(db, 'pagamentos', pagamentoId, 'parcelas'),
      orderBy('numero'),
    ),
  )
  return snap.docs.map((d) => toParcela(d.id, d.data()))
}

export async function upsertParcelas(
  db: Firestore,
  pagamentoId: string,
  parcelas: ParcelaInsert[],
): Promise<Parcela[]> {
  const now = new Date().toISOString()
  const results: Parcela[] = []

  for (const p of parcelas) {
    const ref = await addDoc(collection(db, 'pagamentos', pagamentoId, 'parcelas'), {
      ...p,
      created_at: now,
      updated_at: now,
    })
    const snap = await getDoc(ref)
    results.push(toParcela(snap.id, snap.data()!))
  }

  return results
}

export async function updateParcelaStatus(
  db: Firestore,
  pagamentoId: string,
  id: string,
  status: StatusParcela,
  valorPago?: number,
  dataPagamento?: string,
): Promise<void> {
  await updateDoc(doc(db, 'pagamentos', pagamentoId, 'parcelas', id), {
    status,
    valor_pago_jpy: valorPago ?? 0,
    data_pagamento: dataPagamento ?? null,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteParcela(
  db: Firestore,
  pagamentoId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, 'pagamentos', pagamentoId, 'parcelas', id))
}

export interface ResumoMensal extends DashboardFinanceiro {
  mes: string // YYYY-MM
}

export interface PrevisaoMes {
  mes: string // YYYY-MM
  total_previsto: number
  quantidade: number
}

export async function getResumoMultiplosMeses(
  db: Firestore,
  meses: string[], // YYYY-MM[]
): Promise<ResumoMensal[]> {
  return Promise.all(
    meses.map(async (mes) => {
      const dash = await getDashboardFinanceiro(db, mes)
      return { mes, ...dash }
    }),
  )
}

export async function listPagamentosByMes(
  db: Firestore,
  mes: string, // YYYY-MM
): Promise<Pagamento[]> {
  const inicio = `${mes}-01`
  const nextMonth = new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1))
  const fim = nextMonth.toISOString().slice(0, 10)

  const snap = await getDocs(
    query(
      collection(db, 'pagamentos'),
      where('created_at', '>=', inicio),
      where('created_at', '<', fim),
      orderBy('created_at', 'desc'),
    ),
  )
  return snap.docs.map((d) => toPagamento(d.id, d.data()))
}

export async function getPrevisaoProximosMeses(
  db: Firestore,
  meses: string[], // YYYY-MM[] — meses futuros
): Promise<PrevisaoMes[]> {
  return Promise.all(
    meses.map(async (mes) => {
      const inicio = `${mes}-01`
      const nextMonth = new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1))
      const fim = nextMonth.toISOString().slice(0, 10)

      const snap = await getDocs(
        query(
          collection(db, 'pagamentos'),
          where('data_vencimento', '>=', inicio),
          where('data_vencimento', '<', fim),
          where('status', '==', 'pendente'),
        ),
      )
      const rows = snap.docs.map((d) => d.data() as { valor_jpy: number })
      return {
        mes,
        total_previsto: rows.reduce((acc, r) => acc + (r.valor_jpy ?? 0), 0),
        quantidade: rows.length,
      }
    }),
  )
}

// ── Gastos ─────────────────────────────────────────────────────────

function toGasto(id: string, data: Record<string, unknown>): Gasto {
  return { id, ...data } as Gasto
}

export async function listGastos(
  db: Firestore,
  mes?: string, // YYYY-MM — se omitido, retorna todos
): Promise<Gasto[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('data', 'desc')]

  if (mes) {
    const inicio = `${mes}-01`
    const nextMonth = new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1))
    const fim = nextMonth.toISOString().slice(0, 10)
    constraints.push(where('data', '>=', inicio))
    constraints.push(where('data', '<', fim))
  }

  const snap = await getDocs(query(collection(db, 'gastos'), ...constraints))
  return snap.docs.map((d) => toGasto(d.id, d.data()))
}

export async function createGasto(db: Firestore, input: GastoInsert): Promise<Gasto> {
  const ref = await addDoc(collection(db, 'gastos'), {
    ...input,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return toGasto(snap.id, snap.data()!)
}

export async function deleteGasto(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'gastos', id))
}

export async function listAdminProfiles(
  db: Firestore,
): Promise<Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('role', '==', 'admin'),
      where('is_active', '==', true),
      orderBy('full_name'),
    ),
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return { id: d.id, full_name: data.full_name, avatar_url: data.avatar_url ?? null }
  })
}
