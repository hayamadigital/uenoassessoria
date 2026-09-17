import { useEffect, useState } from 'react'
import { subscribeAcessoCliente, subscribeAppConfigAcessos } from '@ueno/firebase/queries/acessos'
import type { AcessoCliente, AcessoModulo, AppConfigAcessos } from '@ueno/firebase'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'

export interface ClienteAccess {
  loading: boolean
  error: boolean
  estudosLiberado: boolean
  catalogoLiberado: boolean
  estudosDisponivelGlobalmente: boolean
  catalogoDisponivelGlobalmente: boolean
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
  }, [])

  useEffect(() => {
    setAcessoLoaded(false)
    setAcesso(null)
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
  }, [uid])

  const estudosDisponivelGlobalmente = config?.estudos_disponivel === true
  const catalogoDisponivelGlobalmente = config?.catalogo_disponivel === true

  return {
    loading: !configLoaded || !acessoLoaded,
    error,
    estudosLiberado: moduloEfetivo(acesso?.estudos, estudosDisponivelGlobalmente),
    catalogoLiberado: moduloEfetivo(acesso?.catalogo, catalogoDisponivelGlobalmente),
    estudosDisponivelGlobalmente,
    catalogoDisponivelGlobalmente,
  }
}
