import { safeErrorMessage } from '@/lib/error-message'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { db, functions } from '@/lib/firebase'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { listCategoriasMaterial } from '@ueno/firebase/queries/materiais'
import { getPublicAppConfig, updatePublicAppConfig } from '@ueno/firebase/queries/public-config'
import { getAppConfigAcessos } from '@ueno/firebase/queries/acessos'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/cn'
import i18n from '@/i18n'
import type { ModuloAcesso } from '@ueno/firebase'

type SetAvailabilityRequest = {
  modulo: ModuloAcesso
  disponivel: boolean
  motivo: string
  expected_revision: number
  operation_id: string
}
type SetAvailabilityResponse = { success: boolean; revision: number }

function DisponibilidadeModuloRow({
  modulo,
  titulo,
  disponivel,
  revision,
  onSaved,
}: {
  modulo: ModuloAcesso
  titulo: string
  disponivel: boolean
  revision: number
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [proximoValor, setProximoValor] = useState(disponivel)
  const [motivo, setMotivo] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const setClientModuleAvailability = httpsCallable<SetAvailabilityRequest, SetAvailabilityResponse>(
        functions,
        'setClientModuleAvailability',
      )
      await setClientModuleAvailability({
        modulo,
        disponivel: proximoValor,
        motivo,
        expected_revision: revision,
        operation_id: crypto.randomUUID(),
      })
    },
    onSuccess: () => {
      setOpen(false)
      setMotivo('')
      onSaved()
    },
  })

  function abrir(novoValor: boolean) {
    setProximoValor(novoValor)
    setMotivo('')
    mutation.reset()
    setOpen(true)
  }

  return (
    <div className="flex items-center justify-between rounded-md border p-4">
      <div className="flex items-center gap-3">
        <p className="font-medium">{titulo}</p>
        <Badge variant={disponivel ? 'success' : 'secondary'}>
          {disponivel ? 'Habilitado' : 'Desligado'}
        </Badge>
      </div>
      <Button size="sm" variant="outline" onClick={() => abrir(!disponivel)}>
        {disponivel ? 'Desligar globalmente' : 'Ligar globalmente'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {proximoValor ? `Ligar ${titulo} globalmente` : `Desligar ${titulo} globalmente`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Isso afeta todos os clientes com o módulo concedido individualmente
              {proximoValor ? ': eles passam a ter acesso imediatamente.' : ': eles perdem acesso imediatamente, mesmo com concessão individual ativa.'}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor={`motivo-disponibilidade-${modulo}`}>
                Motivo <span className="text-destructive">*</span>
              </Label>
              <textarea
                id={`motivo-disponibilidade-${modulo}`}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ex: fluxo validado ponta a ponta nos emuladores e em TestFlight"
              />
            </div>
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {safeErrorMessage(mutation.error, 'Erro ao salvar disponibilidade')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              isLoading={mutation.isPending}
              disabled={motivo.trim().length < 5}
              onClick={() => mutation.mutate()}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function PreferenciasTab() {
  const { session, setSession } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedLang, setSelectedLang] = useState<'pt-BR' | 'en'>(
    (session?.preferredLang as 'pt-BR' | 'en') ?? 'pt-BR',
  )
  const { data: publicConfig } = useQuery({
    queryKey: ['public-app-config'],
    queryFn: () => getPublicAppConfig(db),
  })
  const { data: categoriasMaterial = [] } = useQuery({
    queryKey: ['categorias-material'],
    queryFn: () => listCategoriasMaterial(db),
  })
  const { data: appConfigAcessos } = useQuery({
    queryKey: ['app-config-acessos'],
    queryFn: () => getAppConfigAcessos(db),
  })
  const [supportWhatsapp, setSupportWhatsapp] = useState('')
  const [homeMaterialCategoryId, setHomeMaterialCategoryId] = useState('')
  const [simuladoPassingPercentage, setSimuladoPassingPercentage] = useState('70')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (lang: 'pt-BR' | 'en') => {
      if (!session) throw new Error('Sessão inválida')
      await updateProfile(db, session.userId, { preferred_lang: lang })
      await i18n.changeLanguage(lang)
      setSession({ ...session, preferredLang: lang })
    },
    onSuccess: () => {
      setSuccessMsg('Preferências salvas com sucesso.')
      setTimeout(() => setSuccessMsg(null), 3000)
    },
  })

  const supportMutation = useMutation({
    mutationFn: async () => {
      await updatePublicAppConfig(db, {
        support_whatsapp: supportWhatsapp,
        home_material_category_id: homeMaterialCategoryId || null,
        simulado_passing_percentage: Number(simuladoPassingPercentage),
      })
      await queryClient.invalidateQueries({ queryKey: ['public-app-config'] })
    },
    onSuccess: () => {
      setSuccessMsg('Preferências públicas salvas com sucesso.')
      setTimeout(() => setSuccessMsg(null), 3000)
    },
  })

  useEffect(() => {
    setSupportWhatsapp(publicConfig?.support_whatsapp ?? '')
    setHomeMaterialCategoryId(publicConfig?.home_material_category_id ?? '')
    setSimuladoPassingPercentage(String(publicConfig?.simulado_passing_percentage ?? 70))
  }, [publicConfig?.support_whatsapp, publicConfig?.home_material_category_id, publicConfig?.simulado_passing_percentage])

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferências</CardTitle>
          <CardDescription>Configurações de exibição da interface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium">Idioma da Interface</p>
            <p className="text-xs text-muted-foreground">Altera o idioma da interface para você.</p>
            <div className="flex gap-2">
              {(['pt-BR', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={cn(
                    'px-4 py-2 rounded-md border text-sm font-medium transition-colors',
                    selectedLang === lang
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted',
                  )}
                >
                  {lang === 'pt-BR' ? 'Português' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => mutation.mutate(selectedLang)}
              isLoading={mutation.isPending}
              disabled={selectedLang === session?.preferredLang}
            >
              Salvar Preferências
            </Button>
            {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {safeErrorMessage(mutation.error, 'Erro ao salvar')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp de suporte e materiais da home</CardTitle>
          <CardDescription>Define o contato do FAQ e a categoria fixa exibida no mobile do cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="support-whatsapp">Telefone do WhatsApp</Label>
            <Input
              id="support-whatsapp"
              value={supportWhatsapp}
              onChange={(e) => setSupportWhatsapp(e.target.value)}
              placeholder="+81 90 1234-5678"
            />
            <p className="text-xs text-muted-foreground">
              Pode ser informado com `+`, espaços e traços. O app mobile vai transformar isso em link de conversa.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="simulado-passing-percentage">Percentual mínimo para aprovação (%)</Label>
            <Input
              id="simulado-passing-percentage"
              type="number"
              min={0}
              max={100}
              step={1}
              value={simuladoPassingPercentage}
              onChange={(e) => setSimuladoPassingPercentage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">O resultado será aprovado quando atingir este percentual. Padrão: 70%.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-material-category">Categoria fixa de materiais na home</Label>
            <select
              id="home-material-category"
              value={homeMaterialCategoryId}
              onChange={(e) => setHomeMaterialCategoryId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione uma categoria</option>
              {categoriasMaterial.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Essa categoria só aparece no mobile se houver materiais públicos e ativos dentro dela.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => supportMutation.mutate()}
              isLoading={supportMutation.isPending}
              disabled={
                supportWhatsapp.trim() === (publicConfig?.support_whatsapp ?? '').trim() &&
                homeMaterialCategoryId === (publicConfig?.home_material_category_id ?? '') &&
                Number(simuladoPassingPercentage) === (publicConfig?.simulado_passing_percentage ?? 70)
              }
            >
              Salvar preferências
            </Button>
            {supportMutation.isError && (
              <p className="text-sm text-destructive">
                {safeErrorMessage(supportMutation.error, 'Erro ao salvar')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disponibilidade de módulos</CardTitle>
          <CardDescription>
            Liga/desliga Estudos e Catálogo para todos os clientes. Continua exigindo a concessão individual
            em cada cliente — ver aba Acessos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DisponibilidadeModuloRow
            modulo="estudos"
            titulo="Estudos — simulados e materiais"
            disponivel={appConfigAcessos?.estudos_disponivel ?? false}
            revision={appConfigAcessos?.revision ?? 0}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['app-config-acessos'] })}
          />
          <DisponibilidadeModuloRow
            modulo="catalogo"
            titulo="Catálogo de serviços"
            disponivel={appConfigAcessos?.catalogo_disponivel ?? false}
            revision={appConfigAcessos?.revision ?? 0}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['app-config-acessos'] })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
