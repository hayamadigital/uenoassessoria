import { useState } from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listNotificacoes, markAllNotificacoesAsRead } from '@ueno/firebase/queries/notificacoes'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { DataScreen, styles } from './DataScreen'
export function NotificationsScreen() {
  const uid = useAuthStore(s => s.session?.userId)
  const cache = useQueryClient()
  const [saving, setSaving] = useState(false)
  const result = useQuery({ queryKey: ['notificacoes', uid], enabled: !!uid, queryFn: () => listNotificacoes(db, uid!) })
  async function markRead() {
    if (!uid || saving) return
    setSaving(true)
    try { await markAllNotificacoesAsRead(db, uid); await Promise.all([
      cache.invalidateQueries({ queryKey: ['notificacoes', uid] }), cache.invalidateQueries({ queryKey: ['notif-unread', uid] })]) }
    catch { Alert.alert('Não foi possível atualizar', 'Tente novamente.') }
    finally { setSaving(false) }
  }
  return <DataScreen title="Notificações" loading={result.isLoading} error={result.isError}
    retry={() => { void result.refetch() }} empty={result.data?.length === 0 ? 'Você não tem notificações.' : undefined}>
    <TouchableOpacity accessibilityRole="button" style={styles.button} disabled={saving} onPress={() => { void markRead() }}><Text style={styles.link}>{saving ? 'Atualizando…' : 'Marcar todas como lidas'}</Text></TouchableOpacity>
    {result.data?.map(item => <View key={item.id} style={styles.card}>
      <Text style={styles.heading}>{!item.lida ? '• ' : ''}{item.titulo}</Text>
      <Text style={styles.text}>{item.corpo}</Text><Text style={styles.text}>{new Date(item.created_at).toLocaleString('pt-BR')}</Text>
    </View>)}
  </DataScreen>
}
