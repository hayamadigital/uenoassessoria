import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db } from '@/lib/firebase'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { getPublicAppConfig, updatePublicAppConfig } from '@ueno/firebase/queries/public-config'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/cn'
import i18n from '@/i18n'

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
  const [supportWhatsapp, setSupportWhatsapp] = useState('')
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
      await updatePublicAppConfig(db, { support_whatsapp: supportWhatsapp })
      await queryClient.invalidateQueries({ queryKey: ['public-app-config'] })
    },
    onSuccess: () => {
      setSuccessMsg('WhatsApp de suporte salvo com sucesso.')
      setTimeout(() => setSuccessMsg(null), 3000)
    },
  })

  useEffect(() => {
    setSupportWhatsapp(publicConfig?.support_whatsapp ?? '')
  }, [publicConfig?.support_whatsapp])

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
                {mutation.error instanceof Error ? mutation.error.message : 'Erro ao salvar'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp de suporte</CardTitle>
          <CardDescription>Número usado pelo app mobile para abrir o FAQ e iniciar contato.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="flex items-center gap-4">
            <Button
              onClick={() => supportMutation.mutate()}
              isLoading={supportMutation.isPending}
              disabled={supportWhatsapp.trim() === (publicConfig?.support_whatsapp ?? '').trim()}
            >
              Salvar WhatsApp
            </Button>
            {supportMutation.isError && (
              <p className="text-sm text-destructive">
                {supportMutation.error instanceof Error ? supportMutation.error.message : 'Erro ao salvar'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
