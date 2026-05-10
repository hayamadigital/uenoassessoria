import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/firebase'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/cn'
import i18n from '@/i18n'

export function PreferenciasTab() {
  const { session, setSession } = useAuthStore()
  const [selectedLang, setSelectedLang] = useState<'pt-BR' | 'en'>(
    (session?.preferredLang as 'pt-BR' | 'en') ?? 'pt-BR',
  )
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

  return (
    <div className="max-w-md">
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
    </div>
  )
}
