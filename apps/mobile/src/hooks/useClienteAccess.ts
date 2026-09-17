import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { subscribeAcessoCliente, subscribeAppConfigAcessos } from '@ueno/firebase/queries/acessos'
import type { AcessoCliente, AcessoModulo, AppConfigAcessos } from '@ueno/firebase'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'

// expira_em não muda o doc no Firestore quando o relógio simplesmente passa da hora —
// sem isso, um acesso vencido continuaria "liberado" até a próxima escrita/revogação.
const EXPIRATION_CHECK_INTERVAL_MS = 30_000

export interface ClienteAccess {
  loading: boolean
  error: boolean
  estudosLiberado: boolean
  catalogoLiberado: boolean
  estudosDisponivelGlobalmente: boolean
  catalogoDisponivelGlobalmente: boolean
  retry: () => void
}

function moduloEfetivo(modulo: AcessoModulo | undefined, disponivelGlobalmente: boolean): boolean {
  if (!disponivelGlobalmente || !modulo?.habilitado) return false
  if (modulo.expira_em && new Date(modulo.expira_em).getTime() <= Date.now()) return false
  return true
}

// Centralizes the module-access decision (tabs, deep-link guards) so every
// consumer reads the same source instead of re-deriving it from raw docs.
export function useClienteAccess(): ClienteAccess {
  const uid = useAuthStore((state) => state.session?.userId ?? null)

  const [config, setConfig] = useState<AppConfigAcessos | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [acesso, setAcesso] = useState<AcessoCliente | null>(null)
  const [acessoLoaded, setAcessoLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const retry = () => setRetryToken((token) => token + 1)

  useEffect(() => {
    setConfigLoaded(false)
    setError(false)
    const unsubscribe = subscribeAppConfigAcessos(
      db,
      (value) => {
        setConfig(value)
        setConfigLoaded(true)
      },
      () => {
        setError(true)
        setConfigLoaded(true)
      },
    )
    return unsubscribe
  }, [retryToken])

  useEffect(() => {
    setAcessoLoaded(false)
    setAcesso(null)
    setError(false)
    if (!uid) {
      setAcessoLoaded(true)
      return
    }
    const unsubscribe = subscribeAcessoCliente(
      db,
      uid,
      (value) => {
        setAcesso(value)
        setAcessoLoaded(true)
      },
      () => {
        setError(true)
        setAcessoLoaded(true)
      },
    )
    return unsubscribe
  }, [uid, retryToken])

  // expira_em só é reavaliado quando o componente renderiza de novo; sem isto, um acesso
  // que vence enquanto a tela fica aberta continuaria "liberado" até a próxima escrita.
  const [, forceRecheck] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => forceRecheck((tick) => tick + 1), EXPIRATION_CHECK_INTERVAL_MS)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') forceRecheck((tick) => tick + 1)
    })
    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [])

  const estudosDisponivelGlobalmente = config?.estudos_disponivel === true
  const catalogoDisponivelGlobalmente = config?.catalogo_disponivel === true

  // Uma verificação que falhou (rede/regra) nunca deve manter o último estado liberado
  // em cache — "sem confirmação online" é tratado como não liberado, não como liberado.
  return {
    loading: !configLoaded || !acessoLoaded,
    error,
    estudosLiberado: !error && moduloEfetivo(acesso?.estudos, estudosDisponivelGlobalmente),
    catalogoLiberado: !error && moduloEfetivo(acesso?.catalogo, catalogoDisponivelGlobalmente),
    estudosDisponivelGlobalmente,
    catalogoDisponivelGlobalmente,
    retry,
  }
}
