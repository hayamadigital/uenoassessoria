import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listMateriais } from '@ueno/firebase/queries/materiais'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_COLOR: Record<string, string> = {
  pdf: '#0891B2',
  video: colors.err,
  link: '#7E22CE',
  texto: '#0F766E',
  simulado: colors.navy800,
}

const TIPO_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  pdf: 'document-text-outline',
  video: 'videocam-outline',
  link: 'link-outline',
  texto: 'reader-outline',
  simulado: 'book-outline',
}

export default function DocumentosAdminScreen() {
  const { data: materiais, isLoading } = useQuery({
    queryKey: ['admin-materiais-docs'],
    queryFn: () => listMateriais(db),
  })

  const pdfs = (materiais ?? []).filter((m) => m.tipo === 'pdf')
  const outros = (materiais ?? []).filter((m) => m.tipo !== 'pdf' && m.tipo !== 'simulado')
  const todos = [...pdfs, ...outros]

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Módulos · Documentos</Text>
          <Text style={s.headerTitle}>Arquivos e Modelos</Text>
        </View>
        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={s.actionBtnTxt}>Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.statsRow}>
          {[
            { n: pdfs.length, l: 'PDFs', c: '#0891B2' },
            { n: (materiais ?? []).filter((m) => m.tipo === 'video').length, l: 'Vídeos', c: colors.err },
            { n: outros.length, l: 'Links / Texto', c: '#0F766E' },
          ].map(({ n, l, c }) => (
            <View key={l} style={s.statCard}>
              <Text style={[s.statN, { color: c }]}>{n}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>TODOS OS DOCUMENTOS</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : todos.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={32} color={colors.ink300} />
            <Text style={s.emptyTxt}>Nenhum documento cadastrado</Text>
          </View>
        ) : (
          <View style={{ gap: 9 }}>
            {todos.map((m) => {
              const c = TIPO_COLOR[m.tipo] ?? colors.ink500
              const ic = TIPO_ICON[m.tipo] ?? 'document-outline'
              const dt = m.created_at
                ? format(new Date(m.created_at), "d 'de' MMM", { locale: ptBR })
                : '—'
              return (
                <View key={m.id} style={s.docCard}>
                  <View style={[s.docIcon, { backgroundColor: c + '18' }]}>
                    <Ionicons name={ic} size={18} color={c} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.docTitle} numberOfLines={1}>{m.titulo}</Text>
                    <View style={s.docMeta}>
                      <View style={[s.typeBadge, { backgroundColor: c + '18' }]}>
                        <Text style={[s.typeBadgeTxt, { color: c }]}>{m.tipo.toUpperCase()}</Text>
                      </View>
                      <Text style={s.docDate}>{dt}</Text>
                      {!m.is_active && (
                        <View style={[s.typeBadge, { backgroundColor: colors.ink100 }]}>
                          <Text style={[s.typeBadgeTxt, { color: colors.ink400 }]}>Inativo</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.ink300} />
                </View>
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
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.34 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.navy800,
  },
  actionBtnTxt: { fontSize: 12, fontWeight: '600', color: colors.white },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.ink100,
  },
  statN: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  statL: { fontSize: 10, color: colors.ink500 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  docCard: {
    backgroundColor: colors.white, borderRadius: 13, padding: 12,
    borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', gap: 11, alignItems: 'center',
  },
  docIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docTitle: { fontSize: 13, fontWeight: '600', color: colors.ink900, marginBottom: 5 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  typeBadgeTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  docDate: { fontSize: 11, color: colors.ink400 },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 13, color: colors.ink400 },
})
