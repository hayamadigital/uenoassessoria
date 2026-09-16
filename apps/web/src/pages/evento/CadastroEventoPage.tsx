import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { httpsCallable, FunctionsError } from 'firebase/functions'
import { sendPasswordResetEmail } from 'firebase/auth'
import { getPublicAppConfig } from '@ueno/firebase/queries/public-config'
import { auth, db, functions } from '@/lib/firebase'
import { registerSchema, type RegisterInput } from '@ueno/utils/validators'
import {
  INTERESSE_CATEGORIA_OPTIONS,
  INTERESSE_CATEGORIA_LABEL,
  subopcoesDisponiveis,
  COMO_CONHECEU_OPTIONS,
  COMO_CONHECEU_LABEL,
  buildInteresseResumo,
  labelComoConheceu,
  friendlyRegisterErrorMessage,
} from '@ueno/utils/cadastro-evento'
import { CityAutocomplete } from '@/components/CityAutocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function buildWhatsAppUrl(phone: string | null, message: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function buildLeadMessage(data: RegisterInput) {
  return [
    'Olá, visitei a UENO ASSESSORIA no evento e gostaria de receber mais informações.',
    '',
    `Nome: ${data.full_name}`,
    `Data de nascimento: ${data.data_nascimento}`,
    `Cidade: ${data.cidade_jp}${data.provincia_jp ? `, ${data.provincia_jp}` : ''}`,
    `Interesse: ${buildInteresseResumo(data.interesse_categorias, data.interesse_subopcoes)}`,
    `Conheceu a UENO através de: ${labelComoConheceu(data.como_conheceu)}`,
  ].join('\n')
}

function formatBirthdate(raw: string) {
  const digits = raw.replace(/\D/g, '')
  let formatted = digits
  if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
  if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
  return formatted
}

function OptionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      className="rounded-full"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export function CadastroEventoPage() {
  const [submitted, setSubmitted] = useState(false)
  const [whatsappOpened, setWhatsappOpened] = useState(true)

  const { data: publicConfig } = useQuery({
    queryKey: ['public-app-config'],
    queryFn: () => getPublicAppConfig(db),
  })

  const {
    register, handleSubmit, watch, setValue, setError, reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      data_nascimento: '',
      provincia_jp: '',
      cidade_jp: '',
      interesse_categorias: [],
      interesse_subopcoes: [],
    },
  })

  const dataNascimento = watch('data_nascimento')
  const cidadeJp = watch('cidade_jp')
  const interesseCategorias = watch('interesse_categorias')
  const interesseSubopcoes = watch('interesse_subopcoes')
  const comoConheceu = watch('como_conheceu')

  function toggleCategoria(value: (typeof INTERESSE_CATEGORIA_OPTIONS)[number]) {
    const selecionadas = interesseCategorias.includes(value)
      ? interesseCategorias.filter((c) => c !== value)
      : [...interesseCategorias, value]
    setValue('interesse_categorias', selecionadas, { shouldValidate: true })

    // Remove sub-opções que só existiam por causa da categoria removida.
    const validas = new Set(subopcoesDisponiveis(selecionadas).map((o) => o.value))
    setValue('interesse_subopcoes', interesseSubopcoes.filter((s) => validas.has(s)), { shouldValidate: true })
  }

  function toggleSubopcao(value: string) {
    const selecionadas = interesseSubopcoes.includes(value)
      ? interesseSubopcoes.filter((s) => s !== value)
      : [...interesseSubopcoes, value]
    setValue('interesse_subopcoes', selecionadas, { shouldValidate: true })
  }

  const onSubmit = async (data: RegisterInput) => {
    // Abre a aba do WhatsApp já no clique (síncrono) e só troca a URL depois —
    // navegadores (principalmente Safari/iOS) bloqueiam window.open() se ele
    // acontecer depois de um await, então esperar a conta ser criada pra só
    // então abrir a aba faria o pop-up ser bloqueado no tablet do estande.
    const whatsappWindow = window.open('', '_blank')

    try {
      const selfRegister = httpsCallable(functions, 'selfRegister')
      await selfRegister({
        full_name: data.full_name,
        email: data.email,
        data_nascimento: data.data_nascimento,
        provincia_jp: data.provincia_jp,
        cidade_jp: data.cidade_jp,
        interesse_categorias: data.interesse_categorias,
        interesse_subopcoes: data.interesse_subopcoes,
        como_conheceu: data.como_conheceu,
        canal_cadastro: 'web',
      })

      // Sem senha neste formulário: a conta é criada no servidor e este e-mail é
      // quem deixa o visitante definir a própria senha (e confirma o e-mail de
      // quebra). Não bloqueia o fluxo — não esperamos a confirmação aqui.
      auth.languageCode = 'pt-BR'
      sendPasswordResetEmail(auth, data.email).catch((emailError) => {
        console.warn('[Auth] password setup email was not sent:', emailError)
      })

      const url = buildWhatsAppUrl(publicConfig?.support_whatsapp ?? null, buildLeadMessage(data))
      if (url && whatsappWindow) {
        whatsappWindow.location.href = url
        setWhatsappOpened(true)
      } else {
        whatsappWindow?.close()
        setWhatsappOpened(false)
      }

      setSubmitted(true)
    } catch (e: any) {
      whatsappWindow?.close()
      const code = e instanceof FunctionsError ? e.code : undefined
      setError('root', { message: friendlyRegisterErrorMessage(code) })
    }
  }

  function handleNewRegistration() {
    reset()
    setWhatsappOpened(true)
    setSubmitted(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">UENO ASSESSORIA</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cadastro rápido — evento</p>
        </div>

        {submitted ? (
          <Card>
            <CardHeader>
              <CardTitle>Cadastro enviado!</CardTitle>
              <CardDescription>
                {whatsappOpened
                  ? 'Abrimos o WhatsApp com sua mensagem pronta — é só enviar para a UENO.'
                  : 'Sua conta foi criada. Procure a equipe da UENO no estande para continuar pelo WhatsApp.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={handleNewRegistration}>
                Fazer novo cadastro
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Novo acesso</CardTitle>
              <CardDescription>
                Preencha seus dados. Você define sua senha depois, pelo e-mail que vamos te mandar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input id="full_name" placeholder="Seu nome completo" autoComplete="name" {...register('full_name')} />
                  {errors.full_name ? <p className="text-xs text-destructive">{errors.full_name.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de nascimento</Label>
                  <Input
                    id="data_nascimento"
                    placeholder="DD/MM/AAAA"
                    inputMode="numeric"
                    maxLength={10}
                    value={dataNascimento}
                    onChange={(e) => setValue('data_nascimento', formatBirthdate(e.target.value), { shouldValidate: true })}
                  />
                  {errors.data_nascimento ? <p className="text-xs text-destructive">{errors.data_nascimento.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade_jp">Cidade onde mora (Japão)</Label>
                  <CityAutocomplete
                    value={cidadeJp}
                    error={!!errors.cidade_jp}
                    onChangeText={(text) => setValue('cidade_jp', text, { shouldValidate: true })}
                    onSelectCity={(city) => {
                      setValue('cidade_jp', city.cidade, { shouldValidate: true })
                      setValue('provincia_jp', city.provincia, { shouldValidate: true })
                    }}
                  />
                  {errors.cidade_jp ? <p className="text-xs text-destructive">{errors.cidade_jp.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Qual serviço você tem interesse?</Label>
                  <p className="text-xs text-muted-foreground">Pode escolher mais de uma opção.</p>
                  <div className="flex flex-wrap gap-2">
                    {INTERESSE_CATEGORIA_OPTIONS.map((value) => (
                      <OptionButton
                        key={value}
                        active={interesseCategorias.includes(value)}
                        onClick={() => toggleCategoria(value)}
                      >
                        {INTERESSE_CATEGORIA_LABEL[value]}
                      </OptionButton>
                    ))}
                  </div>
                  {errors.interesse_categorias ? <p className="text-xs text-destructive">{errors.interesse_categorias.message}</p> : null}

                  {interesseCategorias.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {subopcoesDisponiveis(interesseCategorias).map((option) => (
                        <OptionButton
                          key={option.value}
                          active={interesseSubopcoes.includes(option.value)}
                          onClick={() => toggleSubopcao(option.value)}
                        >
                          {option.label}
                        </OptionButton>
                      ))}
                    </div>
                  ) : null}
                  {errors.interesse_subopcoes ? <p className="text-xs text-destructive">{errors.interesse_subopcoes.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Como conheceu a UENO ASSESSORIA?</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMO_CONHECEU_OPTIONS.map((option) => (
                      <OptionButton
                        key={option}
                        active={comoConheceu === option}
                        onClick={() => setValue('como_conheceu', option, { shouldValidate: true })}
                      >
                        {COMO_CONHECEU_LABEL[option]}
                      </OptionButton>
                    ))}
                  </div>
                  {errors.como_conheceu ? <p className="text-xs text-destructive">{errors.como_conheceu.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" autoComplete="email" {...register('email')} />
                  {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
                </div>

                {errors.root ? (
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{errors.root.message}</p>
                  </div>
                ) : null}

                <Button type="submit" className="w-full" isLoading={isSubmitting}>
                  Criar conta e continuar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
