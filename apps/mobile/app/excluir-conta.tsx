import { useEffect, useState } from 'react'
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { auth, functions } from '@/lib/firebase'
import { DataScreen, styles } from '@/components/DataScreen'
import { useAuthStore } from '@/stores/auth.store'
import { useSimuladoDraftsStore } from '@/stores/simulado-drafts.store'

type Receipt = { id: string; receipt: string }
type Result = { status: 'pending' | 'processing' | 'completed'; retention: { reason: string; until: string } | null }
const receiptKey = 'ueno-account-deletion-receipt'
export default function DeleteAccount() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [sending, setSending] = useState(false)
  const cache = useQueryClient()
  const session = useAuthStore(s => s.session)
  useEffect(() => {
    let active = true
    SecureStore.getItemAsync(receiptKey).then(value => {
      if (active && value) {
        const saved = JSON.parse(value) as Receipt
        if (!auth.currentUser || saved.id === auth.currentUser.uid) setReceipt(saved)
      }
    }).catch(() => {}).finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [])
  const status = useQuery({ queryKey: ['deletion-receipt', receipt?.id, receipt?.receipt], enabled: !!receipt,
    queryFn: async () => (await httpsCallable<Receipt, Result>(functions, 'getAccountDeletionReceipt')(receipt!)).data,
    refetchInterval: query => query.state.data?.status === 'completed' ? false : 30_000,
  })
  async function request() {
    const user = auth.currentUser
    if (!user?.email || sending || confirmation !== 'EXCLUIR' || !password) return
    setSending(true)
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
      setPassword('')
      const result = await httpsCallable<{ confirmation: string }, Receipt>(functions, 'requestAccountDeletion')({ confirmation })
      setReceipt(result.data)
      try { await SecureStore.setItemAsync(receiptKey, JSON.stringify(result.data)) }
      catch { Alert.alert('Solicitação recebida', 'Não foi possível salvar o protocolo neste aparelho. Mantenha esta tela aberta para acompanhar.') }
    } catch {
      Alert.alert('Não foi possível solicitar', 'Confira sua senha e conexão e tente novamente. Se o pedido já tiver sido recebido, uma nova tentativa recuperará seu acompanhamento.')
    } finally { setSending(false) }
  }
  async function finish() {
    await signOut(auth)
    const uid = receipt?.id ?? session?.userId
    if (uid) {
      const drafts = { ...useSimuladoDraftsStore.getState().drafts }
      delete drafts[uid]
      useSimuladoDraftsStore.setState({ drafts })
    }
    cache.clear(); useAuthStore.getState().clear()
    router.replace('/(auth)/login')
  }
  return <DataScreen back title="Excluir minha conta" loading={restoring}>
    {receipt ? <View style={styles.card}>
      <Text style={styles.heading}>{status.data?.status === 'completed' ? 'Conta excluída' : status.data?.status === 'processing' ? 'Exclusão em andamento' : 'Solicitação recebida'}</Text>
      {status.data?.status === 'completed' ? <>
        <Text style={styles.text}>Sua conta e os dados associados foram excluídos.</Text>
        {status.data.retention ? <Text style={styles.text}>Registros com obrigação de retenção: {status.data.retention.reason}. Descarte previsto para {new Date(status.data.retention.until).toLocaleDateString('pt-BR')}.</Text> : null}
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { void finish().catch(() => Alert.alert('Tente novamente', 'Não foi possível encerrar a sessão.')) }}><Text style={styles.link}>Concluir e sair</Text></TouchableOpacity>
      </> : <Text style={styles.text}>A equipe concluirá a exclusão em até 30 dias. Não é necessário ligar ou enviar mensagem. A confirmação aparecerá nesta tela; guarde este aparelho para acompanhar seu protocolo.</Text>}
      {status.isError ? <Text style={styles.text}>Não foi possível atualizar o andamento. Sua solicitação continua registrada.</Text> : null}
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { void status.refetch() }}><Text style={styles.link}>Atualizar andamento</Text></TouchableOpacity>
    </View> : auth.currentUser ? <View style={styles.card}>
      <Text style={styles.text}>Esta ação solicita a exclusão definitiva da sua conta, perfil, documentos, fotos e histórico. A equipe concluirá em até 30 dias. Contratos e registros financeiros só serão mantidos quando houver obrigação de retenção; o motivo e o prazo serão informados na confirmação.</Text>
      <Text style={styles.text}>Confirme sua senha e digite EXCLUIR para continuar.</Text>
      <TextInput accessibilityLabel="Sua senha" placeholder="Sua senha" secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} style={[styles.text, { padding: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8 }]} />
      <TextInput accessibilityLabel="Digite EXCLUIR" placeholder="EXCLUIR" autoCapitalize="characters" value={confirmation} onChangeText={setConfirmation} style={[styles.text, { padding: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8 }]} />
      <TouchableOpacity accessibilityRole="button" disabled={sending || confirmation !== 'EXCLUIR' || !password} style={[styles.button, { opacity: confirmation === 'EXCLUIR' && password ? 1 : 0.5 }]} onPress={() => { void request() }}><Text style={[styles.link, { color: '#B91C1C' }]}>{sending ? 'Enviando…' : 'Solicitar exclusão definitiva'}</Text></TouchableOpacity>
    </View> : <Text style={styles.text}>Entre na sua conta para solicitar a exclusão.</Text>}
  </DataScreen>
}
