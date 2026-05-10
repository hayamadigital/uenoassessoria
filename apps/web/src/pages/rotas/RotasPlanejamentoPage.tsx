import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import {
  ArrowLeft,
  Wand2,
  Save,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Car,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import {
  getClientesComEtapasParaData,
  listRotasDiaForDate,
  createRotaParaResponsavel,
  updatePontoPartida,
  updatePontoDestino,
  updateEnderecoParada,
  saveOtimizacaoRota,
  createParadasFromEtapas,
  deleteRotaDia,
} from '@ueno/firebase/queries/rotas'
import { listAdminsEInstrutores } from '@ueno/firebase/queries/perfis'
import { listDestinos } from '@ueno/firebase/queries/destinos'
import type { EtapaParaRota, OtimizacaoRotaResultado, TipoPonto } from '@ueno/firebase'
import { PontoCard } from './components/PontoCard'
import { ParadaRow, type ParadaLocal } from './components/ParadaRow'
import { EditEnderecoDialog } from './components/EditEnderecoDialog'
import { ResumoPlanejamentoCard } from './components/ResumoPlanejamentoCard'
import {
  haversineKm,
  recomendarDistribuicao,
  type VeiculoParaDistribuicao,
  type ClienteParaDistribuicao,
} from '@/utils/haversine'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${MAPS_API_KEY}`
    const res = await fetch(url)
    const json = await res.json()
    if (json.status === 'OK' && json.results?.[0]) {
      return json.results[0].geometry.location
    }
    return null
  } catch {
    return null
  }
}

interface VeiculoLocal {
  /** Unique local id (not DB id) */
  localId: string
  rotaId: string | null
  instrutorId: string
  capacidade: number
  destinoId: string | null
  pontoPartida: { endereco: string; nome: string }
  paradas: ParadaLocal[]
  totalKm: number | null
  totalMin: number | null
  isSaving: boolean
  isOtimizando: boolean
  savedOk: boolean
  erroMsg: string | null
}

function formatDayTitle(dateStr: string): string {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function buildMapsLink(pontoPartida: string, paradas: ParadaLocal[], pontoDestino: string): string {
  const enc = encodeURIComponent
  const parts = [pontoPartida, ...paradas.map((p) => p.endereco), pontoDestino]
    .filter(Boolean)
    .map(enc)
  return `https://www.google.com/maps/dir/${parts.join('/')}`
}

export function RotasPlanejamentoPage() {
  const { data: dataParam } = useParams<{ data: string }>()
  const data = dataParam ?? ''
  const session = useAuthStore((s) => s.session)
  const queryClient = useQueryClient()

  const [veiculos, setVeiculos] = useState<VeiculoLocal[]>([])
  const [iniciado, setIniciado] = useState(false)
  const [editandoParada, setEditandoParada] = useState<{
    veiculoLocalId: string
    paradaId: string
  } | null>(null)
  const [isRecomendando, setIsRecomendando] = useState(false)
  const [recomendacaoErro, setRecomendacaoErro] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Queries ─────────────────────────────────────────────────
  const { data: etapas, isLoading: loadingEtapas } = useQuery({
    queryKey: ['etapas-para-data', data],
    queryFn: () => getClientesComEtapasParaData(db, data),
    enabled: !!data,
    staleTime: 30_000,
  })

  const { data: rotasExistentes, isLoading: loadingRotas } = useQuery({
    queryKey: ['rotas-dia-data', data],
    queryFn: () => listRotasDiaForDate(db, data),
    enabled: !!data,
    staleTime: 0,
  })

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['admins-instrutores'],
    queryFn: () => listAdminsEInstrutores(db),
    staleTime: 60_000,
  })

  const { data: destinos = [] } = useQuery({
    queryKey: ['destinos'],
    queryFn: () => listDestinos(db, true),
    staleTime: 60_000,
  })

  // ── Carrega rotas existentes ─────────────────────────────────
  useEffect(() => {
    if (!rotasExistentes || iniciado) return
    if (rotasExistentes.length === 0) return

    const loaded: VeiculoLocal[] = rotasExistentes.map((rota) => ({
      localId: rota.id,
      rotaId: rota.id,
      instrutorId: rota.instrutor_id,
      capacidade: rota.capacidade_veiculo ?? 4,
      destinoId: rota.destino_id ?? null,
      pontoPartida: {
        endereco: rota.ponto_partida_endereco ?? '',
        nome: rota.ponto_partida_nome ?? 'Casa',
      },
      paradas: rota.paradas.map((p) => ({
        id: p.id,
        ordem: p.ordem,
        clienteNome: p.cliente?.profile?.full_name ?? '—',
        etapaNome: '—',
        servicoNome: '—',
        endereco: p.endereco ?? '',
        enderecoOriginal: p.endereco_original,
        tipo: p.tipo_ponto ?? 'residencia',
        pontoNome: p.ponto_nome ?? 'Residência',
        distanciaKm: p.distancia_proxima_parada_km,
        duracaoMin: p.duracao_proxima_parada_min,
        processo_etapa_id: p.processo_etapa_id,
        cliente_id: p.cliente_id,
      })),
      totalKm: rota.distancia_total_km,
      totalMin: rota.duracao_total_min,
      isSaving: false,
      isOtimizando: false,
      savedOk: false,
      erroMsg: null,
    }))

    setVeiculos(loaded)
    setIniciado(true)
  }, [rotasExistentes, iniciado])

  // ── Pool: clientes ainda não atribuídos ──────────────────────
  const clientesAtribuidos = new Set(
    veiculos.flatMap((v) => v.paradas.map((p) => p.processo_etapa_id).filter(Boolean)),
  )
  const pool = (etapas ?? []).filter((e) => !clientesAtribuidos.has(e.etapa_id))

  // ── Iniciar planejamento ─────────────────────────────────────
  function handleIniciarPlanejamento() {
    const defaultResponsavelId = session?.userId ?? responsaveis[0]?.id ?? ''
    const defaultResponsavel = responsaveis.find((r) => r.id === defaultResponsavelId)

    setVeiculos([
      {
        localId: crypto.randomUUID(),
        rotaId: null,
        instrutorId: defaultResponsavelId,
        capacidade: 4,
        destinoId: destinos[0]?.id ?? null,
        pontoPartida: {
          endereco: defaultResponsavel?.endereco_jp ?? '',
          nome: 'Casa',
        },
        paradas: [],
        totalKm: null,
        totalMin: null,
        isSaving: false,
        isOtimizando: false,
        savedOk: false,
        erroMsg: null,
      },
    ])
    setIniciado(true)
  }

  // ── Adicionar veículo ────────────────────────────────────────
  function handleAddVeiculo() {
    const defaultResponsavel = responsaveis.find((r) => r.id === session?.userId)
    setVeiculos((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        rotaId: null,
        instrutorId: session?.userId ?? responsaveis[0]?.id ?? '',
        capacidade: 4,
        destinoId: destinos[0]?.id ?? null,
        pontoPartida: {
          endereco: defaultResponsavel?.endereco_jp ?? '',
          nome: 'Casa',
        },
        paradas: [],
        totalKm: null,
        totalMin: null,
        isSaving: false,
        isOtimizando: false,
        savedOk: false,
        erroMsg: null,
      },
    ])
  }

  // ── Remover veículo ──────────────────────────────────────────
  async function handleRemoveVeiculo(localId: string) {
    const veiculo = veiculos.find((v) => v.localId === localId)
    if (veiculo?.rotaId) {
      await deleteRotaDia(db, veiculo.rotaId)
      queryClient.invalidateQueries({ queryKey: ['rotas-dia-data'] })
      queryClient.invalidateQueries({ queryKey: ['rotas-dia-range'] })
    }
    setVeiculos((prev) => prev.filter((v) => v.localId !== localId))
  }

  // ── Atualizar campo do veículo ───────────────────────────────
  function updateVeiculo(localId: string, updates: Partial<VeiculoLocal>) {
    setVeiculos((prev) =>
      prev.map((v) => (v.localId === localId ? { ...v, ...updates } : v)),
    )
  }

  // ── Atribuir cliente do pool ao veículo ──────────────────────
  function handleAtribuirCliente(etapa: EtapaParaRota, veiculoLocalId: string) {
    const veiculo = veiculos.find((v) => v.localId === veiculoLocalId)
    if (!veiculo) return

    const novaParada: ParadaLocal = {
      id: crypto.randomUUID(),
      ordem: veiculo.paradas.length + 1,
      clienteNome: etapa.cliente_nome,
      etapaNome: etapa.etapa_nome,
      servicoNome: etapa.servico_nome,
      endereco: etapa.endereco_jp ?? '',
      enderecoOriginal: etapa.endereco_jp,
      tipo: 'residencia',
      pontoNome: 'Residência',
      distanciaKm: null,
      duracaoMin: null,
      processo_etapa_id: etapa.etapa_id,
      cliente_id: etapa.cliente_id,
    }
    updateVeiculo(veiculoLocalId, {
      paradas: [...veiculo.paradas, novaParada],
      totalKm: null,
      totalMin: null,
    })
  }

  // ── Remover cliente do veículo de volta ao pool ──────────────
  function handleRemoverDoVeiculo(veiculoLocalId: string, paradaId: string) {
    const veiculo = veiculos.find((v) => v.localId === veiculoLocalId)
    if (!veiculo) return
    updateVeiculo(veiculoLocalId, {
      paradas: veiculo.paradas
        .filter((p) => p.id !== paradaId)
        .map((p, i) => ({ ...p, ordem: i + 1 })),
      totalKm: null,
      totalMin: null,
    })
  }

  // ── DnD por veículo ──────────────────────────────────────────
  function handleDragEnd(veiculoLocalId: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const veiculo = veiculos.find((v) => v.localId === veiculoLocalId)
    if (!veiculo) return

    const oldIdx = veiculo.paradas.findIndex((p) => p.id === active.id)
    const newIdx = veiculo.paradas.findIndex((p) => p.id === over.id)
    const reordenadas = arrayMove(veiculo.paradas, oldIdx, newIdx).map((p, i) => ({
      ...p,
      ordem: i + 1,
    }))
    updateVeiculo(veiculoLocalId, { paradas: reordenadas, totalKm: null, totalMin: null })
  }

  // ── Editar endereço de parada ────────────────────────────────
  function handleSaveEndereco(
    veiculoLocalId: string,
    paradaId: string,
    endereco: string,
    tipo: TipoPonto,
    nome: string,
  ) {
    const veiculo = veiculos.find((v) => v.localId === veiculoLocalId)
    if (!veiculo) return
    updateVeiculo(veiculoLocalId, {
      paradas: veiculo.paradas.map((p) =>
        p.id === paradaId ? { ...p, endereco, tipo, pontoNome: nome } : p,
      ),
    })
  }

  // ── Recomendar distribuição ──────────────────────────────────
  async function handleRecomendar() {
    if (veiculos.length === 0 || !etapas || etapas.length === 0) return
    setIsRecomendando(true)
    setRecomendacaoErro(null)

    try {
      // Geocode vehicle starting points
      const veiculosGeo: VeiculoParaDistribuicao[] = []
      for (const v of veiculos) {
        if (!v.pontoPartida.endereco) continue
        const coords = await geocodeAddress(v.pontoPartida.endereco)
        if (coords) {
          veiculosGeo.push({ id: v.localId, lat: coords.lat, lng: coords.lng, capacidade: v.capacidade })
        }
      }

      if (veiculosGeo.length === 0) {
        setRecomendacaoErro('Configure o ponto de partida de pelo menos um veículo.')
        return
      }

      // Geocode all pool clients
      const clientesGeo: ClienteParaDistribuicao[] = []
      for (const etapa of pool) {
        if (!etapa.endereco_jp) continue
        const coords = await geocodeAddress(etapa.endereco_jp)
        if (coords) {
          clientesGeo.push({ id: etapa.etapa_id, lat: coords.lat, lng: coords.lng })
        }
      }

      if (clientesGeo.length === 0) {
        setRecomendacaoErro('Nenhum cliente do pool tem endereço geocodificável.')
        return
      }

      // Run Haversine distribution
      const distribuicao = recomendarDistribuicao(veiculosGeo, clientesGeo)

      // Apply assignments
      setVeiculos((prev) =>
        prev.map((v) => {
          const ids = distribuicao[v.localId] ?? []
          const novasParadas = ids
            .map((etapaId) => {
              const etapa = pool.find((e) => e.etapa_id === etapaId)
              if (!etapa) return null
              return {
                id: crypto.randomUUID(),
                ordem: 0,
                clienteNome: etapa.cliente_nome,
                etapaNome: etapa.etapa_nome,
                servicoNome: etapa.servico_nome,
                endereco: etapa.endereco_jp ?? '',
                enderecoOriginal: etapa.endereco_jp,
                tipo: 'residencia' as TipoPonto,
                pontoNome: 'Residência',
                distanciaKm: null,
                duracaoMin: null,
                processo_etapa_id: etapa.etapa_id,
                cliente_id: etapa.cliente_id,
              }
            })
            .filter(Boolean) as ParadaLocal[]

          const todasParadas = [...v.paradas, ...novasParadas].map((p, i) => ({
            ...p,
            ordem: i + 1,
          }))
          return { ...v, paradas: todasParadas, totalKm: null, totalMin: null }
        }),
      )
    } catch (err) {
      setRecomendacaoErro(`Erro ao calcular recomendação: ${String(err)}`)
    } finally {
      setIsRecomendando(false)
    }
  }

  // ── Otimizar rota de um veículo ──────────────────────────────
  async function handleOtimizar(veiculoLocalId: string) {
    const veiculo = veiculos.find((v) => v.localId === veiculoLocalId)
    if (!veiculo) return

    if (!veiculo.pontoPartida.endereco) {
      updateVeiculo(veiculoLocalId, { erroMsg: 'Informe o ponto de partida antes de otimizar.' })
      return
    }
    if (veiculo.paradas.some((p) => !p.endereco)) {
      updateVeiculo(veiculoLocalId, { erroMsg: 'Todas as paradas precisam ter endereço para otimizar.' })
      return
    }

    const destino = destinos.find((d) => d.id === veiculo.destinoId)
    const pontoDestino = destino?.endereco ?? ''

    updateVeiculo(veiculoLocalId, { isOtimizando: true, erroMsg: null })

    try {
      const { data: resultado, error } = await db.functions.invoke<OtimizacaoRotaResultado>(
        'otimizar-rota',
        {
          body: {
            ponto_partida: veiculo.pontoPartida.endereco,
            ponto_destino: pontoDestino,
            paradas: veiculo.paradas.map((p) => ({ id: p.id, endereco: p.endereco })),
          },
        },
      )

      if (error || !resultado) throw new Error(String(error ?? 'Erro desconhecido'))

      const ordenadas = resultado.ordem_otimizada.map((id, i) => {
        const p = veiculo.paradas.find((x) => x.id === id)!
        return {
          ...p,
          ordem: i + 1,
          distanciaKm: resultado.trecho_km[i] ?? null,
          duracaoMin: resultado.trecho_min[i] ?? null,
        }
      })
      updateVeiculo(veiculoLocalId, {
        paradas: ordenadas,
        totalKm: resultado.total_km,
        totalMin: resultado.total_min,
        isOtimizando: false,
      })
    } catch (err) {
      updateVeiculo(veiculoLocalId, {
        erroMsg: `Erro ao otimizar: ${String(err)}`,
        isOtimizando: false,
      })
    }
  }

  // ── Salvar veículo ───────────────────────────────────────────
  async function handleSalvar(veiculoLocalId: string) {
    const veiculo = veiculos.find((v) => v.localId === veiculoLocalId)
    if (!veiculo) return

    updateVeiculo(veiculoLocalId, { isSaving: true, savedOk: false, erroMsg: null })

    try {
      const destino = destinos.find((d) => d.id === veiculo.destinoId)

      let rotaId = veiculo.rotaId
      if (!rotaId) {
        const rota = await createRotaParaResponsavel(db, {
          instrutorId: veiculo.instrutorId,
          data,
          capacidade: veiculo.capacidade,
          destinoId: veiculo.destinoId ?? null,
          pontoPartidaEndereco: veiculo.pontoPartida.endereco,
          pontoPartidaNome: veiculo.pontoPartida.nome,
        })
        rotaId = rota.id
        updateVeiculo(veiculoLocalId, { rotaId })
      }

      // Recria paradas
      const etapasParaSalvar = veiculo.paradas.map((p) => ({
        etapa_id: p.processo_etapa_id ?? '',
        etapa_nome: p.etapaNome,
        processo_id: '',
        cliente_id: p.cliente_id ?? '',
        cliente_nome: p.clienteNome,
        endereco_jp: p.endereco || null,
        cidade_jp: null,
        provincia_jp: null,
        mapa_link_jp: null,
        servico_nome: p.servicoNome,
      }))

      const novasParadas = await createParadasFromEtapas(db, rotaId, etapasParaSalvar)

      // Atualiza endereços individuais
      for (let i = 0; i < veiculo.paradas.length; i++) {
        const local = veiculo.paradas[i]
        const dbId = novasParadas[i]?.id
        if (!dbId) continue
        await updateEnderecoParada(db, dbId, local.endereco, local.tipo, local.pontoNome)
      }

      // Ponto de partida
      await updatePontoPartida(db, rotaId, veiculo.pontoPartida.endereco, veiculo.pontoPartida.nome)

      // Destino final
      if (destino) {
        await updatePontoDestino(db, rotaId, destino.endereco, destino.nome)
      }

      // Otimização
      if (veiculo.totalKm != null && veiculo.totalMin != null) {
        const novasIds = novasParadas.map((p) => p.id)
        await saveOtimizacaoRota(db, rotaId, {
          ordem_otimizada: novasIds,
          trecho_km: veiculo.paradas.map((p) => p.distanciaKm ?? 0),
          trecho_min: veiculo.paradas.map((p) => p.duracaoMin ?? 0),
          total_km: veiculo.totalKm,
          total_min: veiculo.totalMin,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['rotas-dia-data'] })
      queryClient.invalidateQueries({ queryKey: ['rotas-dia-range'] })

      updateVeiculo(veiculoLocalId, { isSaving: false, savedOk: true })
      setTimeout(() => updateVeiculo(veiculoLocalId, { savedOk: false }), 3000)
    } catch (err) {
      updateVeiculo(veiculoLocalId, {
        isSaving: false,
        erroMsg: `Erro ao salvar: ${String(err)}`,
      })
    }
  }

  const isLoading = loadingEtapas || loadingRotas

  // ── Parada sendo editada ─────────────────────────────────────
  const paradaEditandoObj = editandoParada
    ? veiculos
        .find((v) => v.localId === editandoParada.veiculoLocalId)
        ?.paradas.find((p) => p.id === editandoParada.paradaId)
    : undefined

  return (
    <div>
      <PageHeader
        title={`Rota — ${formatDayTitle(data)}`}
        subtitle={
          veiculos.length > 0
            ? `${veiculos.length} veículo(s) planejado(s)`
            : 'Nenhuma rota planejada'
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/rotas">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Voltar
              </Button>
            </Link>
            {iniciado && pool.length > 0 && veiculos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecomendar}
                isLoading={isRecomendando}
              >
                <Wand2 className="mr-1 h-3.5 w-3.5" />
                Recomendar Distribuição
              </Button>
            )}
            {iniciado && (
              <Button size="sm" onClick={handleAddVeiculo}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar Veículo
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="p-8 space-y-6">
          {recomendacaoErro && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {recomendacaoErro}
            </div>
          )}

          {/* Pool de clientes */}
          {!iniciado ? (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold mb-3">Clientes com etapas agendadas para este dia</h3>
              {!etapas || etapas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum cliente com etapa agendada para este dia.
                </p>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {etapas.map((e) => (
                      <div
                        key={e.etapa_id}
                        className="flex items-start justify-between gap-3 text-sm p-2 rounded bg-muted/30"
                      >
                        <div>
                          <span className="font-medium">{e.cliente_nome}</span>
                          <span className="text-muted-foreground ml-2">· {e.etapa_nome}</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-48">
                          {e.endereco_jp ?? 'Sem endereço'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleIniciarPlanejamento}>
                    Iniciar Planejamento da Rota
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 items-start">
              {/* ── Pool lateral ──────────────────────────────── */}
              <div className="rounded-lg border bg-card p-4 space-y-3 sticky top-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Clientes sem veículo
                    {pool.length > 0 && (
                      <Badge variant="secondary">{pool.length}</Badge>
                    )}
                  </h3>
                </div>

                {pool.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todos os clientes atribuídos.</p>
                ) : (
                  <div className="space-y-2">
                    {pool.map((e) => (
                      <div key={e.etapa_id} className="text-sm border rounded-md p-2 space-y-1.5">
                        <div>
                          <span className="font-medium">{e.cliente_nome}</span>
                          <span className="text-muted-foreground text-xs block truncate">
                            {e.endereco_jp ?? 'Sem endereço'}
                          </span>
                        </div>
                        {veiculos.length > 0 && (
                          <select
                            className="w-full text-xs h-7 rounded border border-input bg-background px-2"
                            defaultValue=""
                            onChange={(ev) => {
                              if (ev.target.value) {
                                handleAtribuirCliente(e, ev.target.value)
                                ev.target.value = ''
                              }
                            }}
                          >
                            <option value="" disabled>Atribuir para…</option>
                            {veiculos.map((v, idx) => {
                              const resp = responsaveis.find((r) => r.id === v.instrutorId)
                              return (
                                <option key={v.localId} value={v.localId}>
                                  Veículo {idx + 1}
                                  {resp ? ` — ${resp.full_name}` : ''}
                                </option>
                              )
                            })}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Cards de veículo ──────────────────────────── */}
              <div className="space-y-6">
                {veiculos.map((veiculo, idx) => {
                  const destino = destinos.find((d) => d.id === veiculo.destinoId)
                  return (
                    <div key={veiculo.localId} className="rounded-lg border bg-card p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          Veículo {idx + 1}
                          {veiculo.paradas.length > 0 && (
                            <Badge variant="secondary">{veiculo.paradas.length} / {veiculo.capacidade}</Badge>
                          )}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVeiculo(veiculo.localId)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>

                      {/* Config row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Responsável</Label>
                          <Select
                            value={veiculo.instrutorId}
                            onValueChange={(val) => {
                              const resp = responsaveis.find((r) => r.id === val)
                              updateVeiculo(veiculo.localId, {
                                instrutorId: val,
                                pontoPartida: {
                                  endereco: resp?.endereco_jp ?? veiculo.pontoPartida.endereco,
                                  nome: veiculo.pontoPartida.nome,
                                },
                              })
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {responsaveis.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.full_name}
                                  <span className="text-muted-foreground ml-1 text-xs">
                                    ({r.role})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Capacidade (pessoas)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            className="h-8 text-xs"
                            value={veiculo.capacidade}
                            onChange={(e) =>
                              updateVeiculo(veiculo.localId, {
                                capacidade: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Destino Final</Label>
                          <Select
                            value={veiculo.destinoId ?? ''}
                            onValueChange={(val) =>
                              updateVeiculo(veiculo.localId, { destinoId: val || null })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecionar destino" />
                            </SelectTrigger>
                            <SelectContent>
                              {destinos.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Ponto de partida */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">Ponto de Partida</h4>
                        <PontoCard
                          label="De onde este veículo sairá"
                          endereco={veiculo.pontoPartida.endereco}
                          nome={veiculo.pontoPartida.nome}
                          onSave={(end, nom) =>
                            updateVeiculo(veiculo.localId, {
                              pontoPartida: { endereco: end, nome: nom },
                            })
                          }
                        />
                      </div>

                      {/* Paradas */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            Pontos de Coleta
                            <Badge variant="secondary" className="ml-2">
                              {veiculo.paradas.length}
                            </Badge>
                          </h4>
                          <span className="text-xs text-muted-foreground">Arraste para reordenar</span>
                        </div>

                        {veiculo.paradas.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma parada. Atribua clientes do pool.</p>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(veiculo.localId, e)}
                          >
                            <SortableContext
                              items={veiculo.paradas.map((p) => p.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {veiculo.paradas.map((parada) => (
                                  <div key={parada.id} className="flex items-center gap-1">
                                    <div className="flex-1">
                                      <ParadaRow
                                        parada={parada}
                                        onEdit={(id) =>
                                          setEditandoParada({
                                            veiculoLocalId: veiculo.localId,
                                            paradaId: id,
                                          })
                                        }
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="shrink-0"
                                      onClick={() =>
                                        handleRemoverDoVeiculo(veiculo.localId, parada.id)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>

                      {/* Destino (display) */}
                      {destino && (
                        <div className="text-xs text-muted-foreground border-t pt-3">
                          <span className="font-medium">Destino:</span> {destino.nome}
                          {destino.endereco && (
                            <span className="ml-1">— {destino.endereco}</span>
                          )}
                        </div>
                      )}

                      {/* Resumo */}
                      <ResumoPlanejamentoCard
                        paradas={veiculo.paradas}
                        totalKm={veiculo.totalKm}
                        totalMin={veiculo.totalMin}
                        pontoPartidaNome={veiculo.pontoPartida.nome}
                        pontoDestinoNome={destino?.nome ?? 'Destino'}
                      />

                      {/* Erro */}
                      {veiculo.erroMsg && (
                        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          {veiculo.erroMsg}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap border-t pt-3">
                        {veiculo.paradas.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOtimizar(veiculo.localId)}
                            isLoading={veiculo.isOtimizando}
                          >
                            <Wand2 className="mr-1 h-3.5 w-3.5" />
                            Otimizar Rota
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSalvar(veiculo.localId)}
                          isLoading={veiculo.isSaving}
                        >
                          {veiculo.savedOk ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Salvo!
                            </>
                          ) : (
                            <>
                              <Save className="mr-1 h-3.5 w-3.5" />
                              Salvar Rota
                            </>
                          )}
                        </Button>
                        {veiculo.paradas.length > 0 && veiculo.pontoPartida.endereco && (
                          <a
                            href={buildMapsLink(
                              veiculo.pontoPartida.endereco,
                              veiculo.paradas,
                              destino?.endereco ?? '',
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}

                {veiculos.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Nenhum veículo adicionado.{' '}
                    <button className="text-primary underline" onClick={handleAddVeiculo}>
                      Adicionar veículo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog de edição de endereço */}
      <EditEnderecoDialog
        open={!!editandoParada}
        clienteNome={paradaEditandoObj?.clienteNome ?? ''}
        enderecoAtual={paradaEditandoObj?.endereco ?? ''}
        tipoAtual={paradaEditandoObj?.tipo ?? 'residencia'}
        nomeAtual={paradaEditandoObj?.pontoNome ?? ''}
        onClose={() => setEditandoParada(null)}
        onSave={(end, tipo, nome) => {
          if (editandoParada) {
            handleSaveEndereco(
              editandoParada.veiculoLocalId,
              editandoParada.paradaId,
              end,
              tipo,
              nome,
            )
          }
          setEditandoParada(null)
        }}
      />
    </div>
  )
}
