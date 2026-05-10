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
import type {
  DestinoFixo,
  EtapaParaRota,
  OtimizacaoRotaResultado,
  RotaDia,
  RotaDiaInsert,
  RotaDiaWithParadas,
  RotaParada,
  RotaParadaInsert,
  RotaParadaWithCliente,
  StatusParada,
  TipoPonto,
} from '../types'

// ── JST helpers ────────────────────────────────────────────────────

function jstDayStartUTC(jstDateStr: string): string {
  return new Date(`${jstDateStr}T00:00:00+09:00`).toISOString()
}

function jstDayEndUTC(jstDateStr: string): string {
  return new Date(`${jstDateStr}T23:59:59.999+09:00`).toISOString()
}

function todayJST(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateStrFromUTCInJST(utcIso: string): string {
  const d = new Date(new Date(utcIso).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toRota(id: string, data: Record<string, unknown>): RotaDia {
  return { id, ...data } as RotaDia
}

function toParada(id: string, data: Record<string, unknown>): RotaParada {
  return { id, ...data } as RotaParada
}

// ── Main queries ───────────────────────────────────────────────────

export async function getRotaDia(
  db: Firestore,
  instrutorId: string,
  data: string,
): Promise<RotaDiaWithParadas | null> {
  const snap = await getDocs(
    query(
      collection(db, 'rotas_dia'),
      where('instrutor_id', '==', instrutorId),
      where('data', '==', data),
    ),
  )
  if (snap.empty) return null
  const rotaDoc = snap.docs[0]
  return buildRotaWithParadas(db, rotaDoc.id, rotaDoc.data() as RotaDia)
}

async function buildRotaWithParadas(
  db: Firestore,
  rotaId: string,
  rota: RotaDia,
): Promise<RotaDiaWithParadas> {
  const paradasSnap = await getDocs(
    query(collection(db, 'rotas_dia', rotaId, 'paradas'), orderBy('ordem')),
  )
  const paradas = await Promise.all(
    paradasSnap.docs.map(async (d) => {
      const p = toParada(d.id, d.data())
      let clienteData = null
      let agendamentoData = null

      if (p.cliente_id) {
        const cSnap = await getDoc(doc(db, 'clientes', p.cliente_id))
        if (cSnap.exists()) {
          const c = cSnap.data()
          const prSnap = await getDoc(doc(db, 'users', c.profile_id as string))
          clienteData = {
            id: cSnap.id,
            endereco_jp: c.endereco_jp,
            cidade_jp: c.cidade_jp,
            provincia_jp: c.provincia_jp,
            mapa_link_jp: c.mapa_link_jp,
            profile: { id: prSnap.id, full_name: prSnap.data()?.full_name },
          }
        }
      }

      if (p.agendamento_id) {
        const agSnap = await getDoc(doc(db, 'agendamentos', p.agendamento_id))
        if (agSnap.exists()) {
          const ag = agSnap.data()
          const [cSnap, instrSnap, servSnap] = await Promise.all([
            getDoc(doc(db, 'clientes', ag.cliente_id as string)),
            getDoc(doc(db, 'users', ag.instrutor_id as string)),
            getDoc(doc(db, 'servicos', ag.servico_id as string)),
          ])
          agendamentoData = {
            id: agSnap.id,
            ...ag,
            cliente: { id: cSnap.id, ...cSnap.data() },
            instrutor: { id: instrSnap.id, ...instrSnap.data() },
            servico: { id: servSnap.id, ...servSnap.data() },
          }
        }
      }

      return { ...p, cliente: clienteData, agendamento: agendamentoData } as RotaParadaWithCliente
    }),
  )

  let responsavel = null
  const rSnap = await getDoc(doc(db, 'users', rota.instrutor_id))
  if (rSnap.exists()) {
    const rd = rSnap.data()
    responsavel = { id: rSnap.id, full_name: rd.full_name, avatar_url: rd.avatar_url, endereco_jp: rd.endereco_jp }
  }

  let destino: DestinoFixo | null = null
  if (rota.destino_id) {
    const dSnap = await getDoc(doc(db, 'destinos_fixos', rota.destino_id))
    if (dSnap.exists()) destino = { id: dSnap.id, ...dSnap.data() } as DestinoFixo
  }

  return { ...rota, id: rotaId, paradas, responsavel, destino }
}

export async function listRotasDia(db: Firestore, data: string): Promise<RotaDia[]> {
  const snap = await getDocs(query(collection(db, 'rotas_dia'), where('data', '==', data)))
  return snap.docs.map((d) => toRota(d.id, d.data()))
}

export async function listRotasDiaRange(
  db: Firestore,
  dataInicio: string,
  dataFim: string,
): Promise<RotaDia[]> {
  const snap = await getDocs(
    query(
      collection(db, 'rotas_dia'),
      where('data', '>=', dataInicio),
      where('data', '<=', dataFim),
      orderBy('data'),
    ),
  )
  return snap.docs.map((d) => toRota(d.id, d.data()))
}

export async function createRotaDia(db: Firestore, input: RotaDiaInsert): Promise<RotaDia> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'rotas_dia'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toRota(snap.id, snap.data()!)
}

export async function addParadaToRota(
  db: Firestore,
  rotaId: string,
  input: RotaParadaInsert,
): Promise<RotaParada> {
  const ref = await addDoc(collection(db, 'rotas_dia', rotaId, 'paradas'), {
    ...input,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return toParada(snap.id, snap.data()!)
}

export async function updateParadaStatus(
  db: Firestore,
  rotaId: string,
  id: string,
  status: StatusParada,
  chegadaReal?: string,
): Promise<void> {
  await updateDoc(doc(db, 'rotas_dia', rotaId, 'paradas', id), {
    status,
    chegada_real: chegadaReal ?? null,
  })
}

export async function getOrCreateRotaDia(
  db: Firestore,
  instrutorId: string,
  data: string,
): Promise<RotaDia> {
  const existing = await getDocs(
    query(
      collection(db, 'rotas_dia'),
      where('instrutor_id', '==', instrutorId),
      where('data', '==', data),
      orderBy('created_at'),
    ),
  )
  if (!existing.empty) return toRota(existing.docs[0].id, existing.docs[0].data())
  return createRotaDia(db, { instrutor_id: instrutorId, data, status: 'planejado' } as RotaDiaInsert)
}

export async function createRotaParaResponsavel(
  db: Firestore,
  input: {
    instrutorId: string
    data: string
    capacidade?: number | null
    destinoId?: string | null
    pontoPartidaEndereco?: string | null
    pontoPartidaNome?: string | null
  },
): Promise<RotaDia> {
  return createRotaDia(db, {
    instrutor_id: input.instrutorId,
    data: input.data,
    status: 'planejado',
    capacidade_veiculo: input.capacidade ?? null,
    destino_id: input.destinoId ?? null,
    ponto_partida_endereco: input.pontoPartidaEndereco ?? null,
    ponto_partida_nome: input.pontoPartidaNome ?? null,
  } as RotaDiaInsert)
}

export async function listRotasDiaForDate(
  db: Firestore,
  data: string,
): Promise<RotaDiaWithParadas[]> {
  const snap = await getDocs(
    query(collection(db, 'rotas_dia'), where('data', '==', data), orderBy('created_at')),
  )
  return Promise.all(snap.docs.map((d) => buildRotaWithParadas(db, d.id, d.data() as RotaDia)))
}

export async function updateRotaMetadata(
  db: Firestore,
  rotaId: string,
  input: {
    capacidade_veiculo?: number | null
    destino_id?: string | null
    ponto_partida_endereco?: string | null
    ponto_partida_nome?: string | null
    ponto_destino_endereco?: string | null
    ponto_destino_nome?: string | null
  },
): Promise<RotaDia> {
  await updateDoc(doc(db, 'rotas_dia', rotaId), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'rotas_dia', rotaId))
  return toRota(snap.id, snap.data()!)
}

export async function deleteRotaDia(db: Firestore, rotaId: string): Promise<void> {
  const paradasSnap = await getDocs(collection(db, 'rotas_dia', rotaId, 'paradas'))
  await Promise.all(paradasSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'rotas_dia', rotaId))
}

export async function getClientesComEtapasParaData(
  db: Firestore,
  data: string,
): Promise<EtapaParaRota[]> {
  const startUTC = jstDayStartUTC(data)
  const endUTC = jstDayEndUTC(data)

  const snap = await getDocs(
    query(
      collection(db, 'processo_etapas'),
      where('data_agendada', '>=', startUTC),
      where('data_agendada', '<=', endUTC),
      where('status', 'in', ['pendente', 'em_andamento']),
    ),
  )

  const results: EtapaParaRota[] = []

  for (const d of snap.docs) {
    const etapa = d.data()
    const processoSnap = await getDoc(doc(db, 'cliente_processos', etapa.processo_id as string))
    if (!processoSnap.exists()) continue
    const processo = processoSnap.data()

    const [clienteSnap, servicoSnap] = await Promise.all([
      getDoc(doc(db, 'clientes', processo.cliente_id as string)),
      getDoc(doc(db, 'servicos', processo.servico_id as string)),
    ])
    if (!clienteSnap.exists()) continue

    const cliente = clienteSnap.data()
    const perfil = await getDoc(doc(db, 'users', cliente.profile_id as string))
    const enderecoCompleto = [cliente.provincia_jp, cliente.cidade_jp, cliente.bairro_jp, cliente.numero_bloco_jp, cliente.apartamento_jp]
      .filter(Boolean)
      .join(' ') || (cliente.endereco_jp as string | null) || null

    results.push({
      etapa_id: d.id,
      etapa_nome: etapa.nome as string,
      processo_id: etapa.processo_id as string,
      cliente_id: processo.cliente_id as string,
      cliente_nome: (perfil.data()?.full_name as string) ?? '—',
      endereco_jp: enderecoCompleto,
      cidade_jp: (cliente.cidade_jp as string | null) ?? null,
      provincia_jp: (cliente.provincia_jp as string | null) ?? null,
      mapa_link_jp: (cliente.mapa_link_jp as string | null) ?? null,
      servico_nome: (servicoSnap.data()?.nome as string) ?? '—',
    })
  }

  return results
}

export async function getDiasComEtapasRange(
  db: Firestore,
  dataInicio: string,
  dataFim: string,
): Promise<Array<{ data: string; total: number }>> {
  const startUTC = jstDayStartUTC(dataInicio)
  const endUTC = jstDayEndUTC(dataFim)

  const snap = await getDocs(
    query(
      collection(db, 'processo_etapas'),
      where('data_agendada', '>=', startUTC),
      where('data_agendada', '<=', endUTC),
      where('status', 'in', ['pendente', 'em_andamento']),
    ),
  )

  const countByDay: Record<string, number> = {}
  const days: string[] = []
  let cursor = dataInicio
  while (cursor <= dataFim) {
    countByDay[cursor] = 0
    days.push(cursor)
    cursor = addDaysToDateStr(cursor, 1)
  }

  for (const d of snap.docs) {
    const dataAgendada = d.data().data_agendada as string | null
    if (!dataAgendada) continue
    const key = dateStrFromUTCInJST(dataAgendada)
    if (key in countByDay) countByDay[key]++
  }

  return days.map((d) => ({ data: d, total: countByDay[d] ?? 0 }))
}

export async function createParadasFromEtapas(
  db: Firestore,
  rotaId: string,
  etapas: EtapaParaRota[],
): Promise<RotaParada[]> {
  const existingSnap = await getDocs(collection(db, 'rotas_dia', rotaId, 'paradas'))
  await Promise.all(existingSnap.docs.map((d) => deleteDoc(d.ref)))
  if (etapas.length === 0) return []

  const refs = await Promise.all(
    etapas.map((etapa, index) =>
      addDoc(collection(db, 'rotas_dia', rotaId, 'paradas'), {
        rota_id: rotaId,
        processo_etapa_id: etapa.etapa_id,
        cliente_id: etapa.cliente_id,
        ordem: index + 1,
        endereco: etapa.endereco_jp,
        endereco_original: etapa.endereco_jp,
        tipo_ponto: 'residencia' as TipoPonto,
        ponto_nome: 'Residência',
        notas: null,
        agendamento_id: null,
        chegada_real: null,
        status: 'pendente',
        distancia_proxima_parada_km: null,
        duracao_proxima_parada_min: null,
        created_at: new Date().toISOString(),
      }),
    ),
  )

  const snaps = await Promise.all(refs.map((r) => getDoc(r)))
  return snaps.map((s) => toParada(s.id, s.data()!))
}

export async function reorderParadas(
  db: Firestore,
  rotaId: string,
  updates: Array<{ id: string; ordem: number }>,
): Promise<void> {
  await Promise.all(
    updates.map((u) => updateDoc(doc(db, 'rotas_dia', rotaId, 'paradas', u.id), { ordem: u.ordem })),
  )
}

export async function saveOtimizacaoRota(
  db: Firestore,
  rotaId: string,
  resultado: OtimizacaoRotaResultado,
): Promise<void> {
  await reorderParadas(
    db,
    rotaId,
    resultado.ordem_otimizada.map((id, i) => ({ id, ordem: i + 1 })),
  )

  await Promise.all(
    resultado.ordem_otimizada.map((id, i) =>
      updateDoc(doc(db, 'rotas_dia', rotaId, 'paradas', id), {
        distancia_proxima_parada_km: resultado.trecho_km[i] ?? null,
        duracao_proxima_parada_min: resultado.trecho_min[i] ?? null,
      }),
    ),
  )

  await updateDoc(doc(db, 'rotas_dia', rotaId), {
    distancia_total_km: resultado.total_km,
    duracao_total_min: resultado.total_min,
    updated_at: new Date().toISOString(),
  })
}

export async function updatePontoPartida(
  db: Firestore,
  rotaId: string,
  endereco: string,
  nome: string,
): Promise<RotaDia> {
  await updateDoc(doc(db, 'rotas_dia', rotaId), {
    ponto_partida_endereco: endereco,
    ponto_partida_nome: nome,
    updated_at: new Date().toISOString(),
  })
  const snap = await getDoc(doc(db, 'rotas_dia', rotaId))
  return toRota(snap.id, snap.data()!)
}

export async function updatePontoDestino(
  db: Firestore,
  rotaId: string,
  endereco: string,
  nome: string,
): Promise<RotaDia> {
  await updateDoc(doc(db, 'rotas_dia', rotaId), {
    ponto_destino_endereco: endereco,
    ponto_destino_nome: nome,
    updated_at: new Date().toISOString(),
  })
  const snap = await getDoc(doc(db, 'rotas_dia', rotaId))
  return toRota(snap.id, snap.data()!)
}

export async function updateEnderecoParada(
  db: Firestore,
  rotaId: string,
  paradaId: string,
  endereco: string,
  tipo: TipoPonto,
  nome: string,
): Promise<RotaParada> {
  await updateDoc(doc(db, 'rotas_dia', rotaId, 'paradas', paradaId), {
    endereco,
    tipo_ponto: tipo,
    ponto_nome: nome,
  })
  const snap = await getDoc(doc(db, 'rotas_dia', rotaId, 'paradas', paradaId))
  return toParada(snap.id, snap.data()!)
}

export function getProximosDiasJST(n = 7): string[] {
  const today = todayJST()
  return Array.from({ length: n }, (_, i) => addDaysToDateStr(today, i + 1))
}
