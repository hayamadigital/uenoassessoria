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
import type { Avaliacao, AvaliacaoComDetalhes, AvaliacaoInsert, AvaliacaoTipo, TipoMaterial } from '../types'

export interface FiltrosAvaliacao {
  tipo?: AvaliacaoTipo
  respondido?: boolean
  nota?: number
  clienteId?: string
  instrutorId?: string
}

export interface EstatisticasAvaliacoes {
  total: number
  media: number
  pendentes: number
  respondidas: number
  por_tipo: {
    servico: { total: number; media: number }
    material: { total: number; media: number }
    simulado: { total: number; media: number }
  }
}

function toAvaliacao(id: string, data: Record<string, unknown>): Avaliacao {
  return { id, ...data } as Avaliacao
}

async function enrichAvaliacao(db: Firestore, av: Avaliacao): Promise<AvaliacaoComDetalhes> {
  const [clienteSnap, materialSnap, agSnap] = await Promise.all([
    getDoc(doc(db, 'clientes', av.cliente_id)),
    av.material_id ? getDoc(doc(db, 'materiais', av.material_id)) : Promise.resolve(null),
    av.agendamento_id ? getDoc(doc(db, 'agendamentos', av.agendamento_id)) : Promise.resolve(null),
  ])

  let profileSnap = null
  if (clienteSnap.exists()) {
    const profileId = clienteSnap.data().profile_id as string
    profileSnap = await getDoc(doc(db, 'users', profileId))
  }

  let servicoNome: string | null = null
  if (agSnap?.exists()) {
    const servicoId = agSnap.data().servico_id as string
    const servicoSnap = await getDoc(doc(db, 'servicos', servicoId))
    servicoNome = servicoSnap.exists() ? (servicoSnap.data().nome as string) : null
  }

  return {
    ...av,
    cliente_nome: profileSnap?.data()?.full_name as string ?? null,
    cliente_avatar_url: profileSnap?.data()?.avatar_url as string ?? null,
    material_titulo: materialSnap?.data()?.titulo as string ?? null,
    material_tipo: (materialSnap?.data()?.tipo as TipoMaterial | undefined) ?? null,
    servico_nome: servicoNome,
  }
}

export async function listAvaliacoes(
  db: Firestore,
  filtros?: FiltrosAvaliacao,
): Promise<AvaliacaoComDetalhes[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('created_at', 'desc')]
  if (filtros?.tipo) constraints.push(where('tipo', '==', filtros.tipo))
  if (filtros?.clienteId) constraints.push(where('cliente_id', '==', filtros.clienteId))
  if (filtros?.instrutorId) constraints.push(where('instrutor_id', '==', filtros.instrutorId))
  if (filtros?.nota) constraints.push(where('nota', '==', filtros.nota))

  const snap = await getDocs(query(collection(db, 'avaliacoes'), ...constraints))
  let avaliacoes = snap.docs.map((d) => toAvaliacao(d.id, d.data()))

  if (filtros?.respondido !== undefined) {
    avaliacoes = avaliacoes.filter((a) =>
      filtros.respondido ? !!a.respondido_em : !a.respondido_em,
    )
  }

  return Promise.all(avaliacoes.map((a) => enrichAvaliacao(db, a)))
}

export async function listAvaliacoesByCliente(
  db: Firestore,
  clienteId: string,
): Promise<AvaliacaoComDetalhes[]> {
  return listAvaliacoes(db, { clienteId })
}

export async function createAvaliacao(db: Firestore, input: AvaliacaoInsert): Promise<Avaliacao> {
  const ref = await addDoc(collection(db, 'avaliacoes'), {
    ...input,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return toAvaliacao(snap.id, snap.data()!)
}

export async function responderAvaliacao(
  db: Firestore,
  id: string,
  resposta: string,
): Promise<void> {
  await updateDoc(doc(db, 'avaliacoes', id), {
    resposta_admin: resposta,
    respondido_em: new Date().toISOString(),
  })
}

export async function getEstatisticasAvaliacoes(db: Firestore): Promise<EstatisticasAvaliacoes> {
  const snap = await getDocs(collection(db, 'avaliacoes'))
  const rows = snap.docs.map((d) => d.data() as { nota: number; tipo: AvaliacaoTipo; respondido_em: string | null })

  const calcMedia = (notas: number[]) =>
    notas.length === 0 ? 0 : Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1))

  const porTipo = (tipo: AvaliacaoTipo) => {
    const filtered = rows.filter((r) => r.tipo === tipo)
    return { total: filtered.length, media: calcMedia(filtered.map((r) => r.nota)) }
  }

  return {
    total: rows.length,
    media: calcMedia(rows.map((r) => r.nota)),
    pendentes: rows.filter((r) => !r.respondido_em).length,
    respondidas: rows.filter((r) => !!r.respondido_em).length,
    por_tipo: {
      servico: porTipo('servico'),
      material: porTipo('material'),
      simulado: porTipo('simulado'),
    },
  }
}

export async function getMediaAvaliacoes(
  db: Firestore,
  instrutorId?: string,
): Promise<number> {
  const constraints: Parameters<typeof query>[1][] = []
  if (instrutorId) constraints.push(where('instrutor_id', '==', instrutorId))
  const snap = await getDocs(query(collection(db, 'avaliacoes'), ...constraints))
  const notas = snap.docs.map((d) => d.data().nota as number)
  if (notas.length === 0) return 0
  return notas.reduce((a, b) => a + b, 0) / notas.length
}
