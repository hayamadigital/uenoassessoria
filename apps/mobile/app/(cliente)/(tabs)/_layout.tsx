import { Tabs } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { colors } from '@/theme'

export default function TabsLayout() {
  const { session } = useAuthStore()
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false)
  const promptedProcessIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: processos } = useQuery({
    queryKey: ['processos', cliente?.id, 'tabs'],
    queryFn: () => listProcessosByCliente(db, cliente!.id),
    enabled: !!cliente,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  })

  const activeProcess = useMemo(
    () => processos?.find((processo) => processo.status === 'ativo') ?? null,
    [processos],
  )
  const approvalStorageKey = activeProcess ? `cliente-processo-aprovado:${activeProcess.id}` : null
  const showProcessosMenu = !!activeProcess

  useEffect(() => {
    let alive = true

    async function syncApprovalAlert() {
      if (!activeProcess || !approvalStorageKey) {
        if (alive) {
          promptedProcessIdRef.current = null
          setApprovalAcknowledged(false)
        }
        return
      }

      if (approvalAcknowledged) return

      const alreadySeen = await AsyncStorage.getItem(approvalStorageKey)
      if (!alive) return

      if (alreadySeen === '1') {
        promptedProcessIdRef.current = activeProcess.id
        setApprovalAcknowledged(true)
        return
      }

      if (promptedProcessIdRef.current === activeProcess.id) return
      promptedProcessIdRef.current = activeProcess.id
      setApprovalAcknowledged(false)
      Alert.alert(
        'Solicitação aprovada',
        'Sua solicitação foi aprovada. Acompanhe as próximas etapas pelo menu Processos.',
        [
          {
            text: 'Acompanhar etapas',
            onPress: async () => {
              await AsyncStorage.setItem(approvalStorageKey, '1')
              if (mountedRef.current) setApprovalAcknowledged(true)
            },
          },
        ],
        { cancelable: false },
      )
    }

    syncApprovalAlert()

    return () => {
      alive = false
    }
  }, [activeProcess, approvalAcknowledged, approvalStorageKey])

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.navy800,
        tabBarInactiveTintColor: colors.ink400,
        tabBarStyle: {
          borderTopColor: colors.ink100,
          borderTopWidth: 1,
          height: 78,
          paddingBottom: 20,
          paddingTop: 8,
          backgroundColor: 'rgba(255,255,255,0.97)',
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="inicio/index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="simulados/index"
        options={{
          title: 'Simulados',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="processos/index"
        options={{
          title: 'Processos',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} />
          ),
          href: showProcessosMenu ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="processos/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="catalogos/index"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'layers' : 'layers-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
