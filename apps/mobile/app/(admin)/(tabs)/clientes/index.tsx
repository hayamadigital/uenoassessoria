import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { Avatar } from '@/components/Avatar'
import { colors } from '@/theme'
import type { StatusProcesso } from '@ueno/firebase'

const STATUS_LABEL: Record<StatusProcesso, string> = {
  prospect: 'Prospect',
  contato: 'Contato',
  documentacao: 'Documentação',
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  aprovado: 'Aprovado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<StatusProcesso, string> = {
  prospect: '#94A3B8',
  contato: '#0891B2',
  documentacao: colors.warn,
  agendado: '#7C3AED',
  em_andamento: colors.navy600,
  aprovado: colors.ok,
  concluido: '#0F766E',
  cancelado: colors.err,
}

type Filtro = 'todos' | 'ativos' | 'concluidos' | 'pendentes'

const FILTROS: { label: string; value: Filtro }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Ativos', value: 'ativos' },
  { label: 'Concluídos', value: 'concluidos' },
  { label: 'Pendentes', value: 'pendentes' },
]

const ATIVOS: StatusProcesso[] = ['documentacao', 'agendado', 'em_andamento']
const PENDENTES: StatusProcesso[] = ['prospect', 'contato']

export default function ClientesAdminScreen() {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['admin-clientes-all'],
    queryFn: () => listClientes(db),
  })

  const filtrados = (clientes ?? []).filter((c) => {
    const nome = c.profile?.full_name?.toLowerCase() ?? ''
    const matchBusca = busca === '' || nome.includes(busca.toLowerCase()) || (c.cpf ?? '').includes(busca)
    const matchFiltro =
      filtro === 'todos' ||
      (filtro === 'ativos' && ATIVOS.includes(c.status_processo)) ||
      (filtro === 'concluidos' && (c.status_processo === 'concluido' || c.status_processo === 'aprovado')) ||
      (filtro === 'pendentes' && PENDENTES.includes(c.status_processo))
    return matchBusca && matchFiltro
  })

  const counts: Record<Filtro, number> = {
    todos: clientes?.length ?? 0,
    ativos: (clientes ?? []).filter((c) => ATIVOS.includes(c.status_processo)).length,
    concluidos: (clientes ?? []).filter((c) => c.status_processo === 'concluido' || c.status_processo === 'aprovado').length,
    pendentes: (clientes ?? []).filter((c) => PENDENTES.includes(c.status_processo)).length,
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>Gerenciamento</Text>
          <Text style={s.headerTitle}>Clientes</Text>
        </View>
        <TouchableOpacity style={s.addBtn} activeOpacity={0.8} onPress={() => router.push('/clientes/novo' as any)}>
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.ink400} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nome ou CPF"
            placeholderTextColor={colors.ink400}
            value={busca}
            onChangeText={setBusca}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <Ionicons name="close-circle" size={16} color={colors.ink300} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter pills */}
      <View style={s.pillsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
          {FILTROS.map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              style={[s.pill, filtro === value && s.pillActive]}
              onPress={() => setFiltro(value)}
              activeOpacity={0.8}
            >
              <Text style={[s.pillTxt, filtro === value && s.pillTxtActive]}>
                {label} · {counts[value]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 32 }} />
        ) : filtrados.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={40} color={colors.ink200} />
            <Text style={s.emptyTxt}>Nenhum cliente encontrado</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtrados.map((c) => {
              const cor = STATUS_COLOR[c.status_processo]
              return (
                <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.85} onPress={() => router.push(`/clientes/${c.id}` as any)}>
                  <View style={[s.cardAccent, { backgroundColor: cor }]} />
                  <Avatar name={c.profile?.full_name ?? 'Cliente'} size={42} />
                  <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    <Text style={s.cardName} numberOfLines={1}>{c.profile?.full_name ?? '—'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <Ionicons name="location-outline" size={11} color={colors.ink400} />
                      <Text style={s.cardMeta}>{c.cidade_jp ?? '—'}</Text>
                      {c.cpf ? (
                        <>
                          <View style={s.dot} />
                          <Text style={s.cardMeta}>{c.cpf}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <View style={[s.statusChip, { backgroundColor: cor + '18' }]}>
                    <Text style={[s.statusTxt, { color: cor }]}>{STATUS_LABEL[c.status_processo]}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.ink300} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.ink900, letterSpacing: -0.4, marginTop: 1 },
  addBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.navy800,
    alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.ink50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.ink100,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.ink900 },

  pillsWrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  pillsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  pill: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink200,
  },
  pillActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  pillTxt: { fontSize: 12, fontWeight: '600', color: colors.ink700, whiteSpace: 'nowrap' as any },
  pillTxtActive: { color: 'white' },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTxt: { fontSize: 14, color: colors.ink400, fontWeight: '500' },

  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 12,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.ink100,
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  cardAccent: { width: 4, height: 38, borderRadius: 2, marginRight: 12 },
  cardName: { fontSize: 14, fontWeight: '600', color: colors.ink900, letterSpacing: -0.2 },
  cardMeta: { fontSize: 11, color: colors.ink500 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.ink400 },
  statusChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusTxt: { fontSize: 10.5, fontWeight: '700' },
})
