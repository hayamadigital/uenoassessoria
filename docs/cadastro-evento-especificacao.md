# Especificação — Cadastro Inicial do Cliente (Evento)

**Prazo:** evento em 5 dias (lançamento do app no evento).
**Prioridade nº1:** captação de leads rápida e simples — o app completo ainda não foi 100% testado pelo dono, então este fluxo precisa ser **isolado** do restante (não depende de financeiro, agendamento, contratos etc.) para não herdar bugs de partes ainda não validadas.

Decisões já tomadas com o dono do projeto (2026-09-15):
- **Web:** página nova dentro de `apps/web` (site institucional/admin), não uma exportação do app mobile. Mais trabalho, mas visual consistente com o site e reaproveita só a lógica (validators + Cloud Function).
- **Verificação de e-mail:** roda em segundo plano. A conta é criada e o e-mail de verificação é disparado, mas **não bloqueia** o visitante — ele segue direto pro WhatsApp. A confirmação só é cobrada depois, quando ele tentar de fato usar o app (mesma tela `verify-email.tsx` que já existe, sem mudança nela).

---

## 1. O que já existe e o que falta

Levantamento feito lendo `apps/mobile/app/(auth)/register.tsx`, `functions/src/index.ts` (`selfRegister`) e `packages/utils/src/validators.ts` (`registerSchema`) — ver também `docs/raio-x-especificacao.md`, item 3.

| Peça | Mobile | Web |
|---|---|---|
| Tela de autocadastro (nome, e-mail, senha, nascimento, província, cidade) | ✅ já existe (`(auth)/register.tsx`) | 🔴 não existe (só há `LoginPage` e `ForgotPasswordPage`) |
| Cloud Function que cria o usuário + perfil + `cliente` | ✅ `selfRegister` (`functions/src/index.ts:73`) | ✅ mesma função, callable também do web (CORS genérico, não é mobile-only) |
| Verificação de e-mail (Firebase Auth) | ✅ `sendVerificationEmail` + tela `verify-email.tsx` | 🔴 não existe fluxo de verificação no web |
| Campo "qual serviço tem interesse" | 🔴 não existe | 🔴 não existe |
| Campo "como conheceu a UENO" | 🔴 não existe | 🔴 não existe |
| Autocomplete de cidade (todo o Japão) | 🔴 hoje é texto livre | 🔴 hoje não existe tela |
| Botão que monta mensagem e abre o WhatsApp do visitante | 🔴 não existe | 🔴 não existe |

Conclusão: no mobile, é **estender** uma tela e uma função que já funcionam. No web, é **construir do zero** uma página pública nova — é o item de maior risco para o prazo de 5 dias (ver seção 9).

---

## 2. Fluxo do usuário

```
Visitante acessa o cadastro (app ou link/QR code do site)
  → preenche nome, nascimento, cidade
  → escolhe o serviço de interesse (com sub-opção)
  → informa como conheceu a UENO
  → preenche e-mail e senha (conta real do sistema)
  → toca em ENVIAR
      → cria conta Firebase Auth (client SDK)
      → chama selfRegister (grava perfil + cliente, status_processo = "prospect")
      → dispara e-mail de verificação em segundo plano (sem esperar confirmação)
      → monta a mensagem de WhatsApp e abre wa.me para o número da UENO
  → visitante manda a mensagem pelo próprio WhatsApp
```

Sem esse envio de WhatsApp não há como saber que o lead "fechou" o fluxo — por isso o botão ENVIAR só é considerado sucesso quando a conta foi criada, mesmo que o app não consiga confirmar se a mensagem foi realmente enviada (o WhatsApp abre já com o texto pronto; o envio em si é uma ação fora do nosso controle).

---

## 3. Campos do formulário

| # | Campo | Tipo de input | Status |
|---|---|---|---|
| 1 | Nome completo | texto | já existe |
| 2 | Data de nascimento | DD/MM/AAAA (já com máscara automática) | já existe |
| 3 | Cidade onde mora (Japão) | busca com sugestões, sem limitar a Shizuoka | **novo** — ver seção 5 (hoje é texto livre) |
| 4 | Interesse — categoria | 2 opções: "Transferência de habilitação" / "Habilitação do zero" | **novo** |
| 4a | Interesse — sub-opção (Transferência) | Carro / Moto / Caminhão | **novo** |
| 4b | Interesse — sub-opção (Habilitação do zero) | Curso Intensivo / Processo direto pelo Menkyou Center | **novo** |
| 5 | Como conheceu a UENO | Amigos/indicação / Facebook-Instagram / Evento / Outros | **novo** |
| 6 | E-mail | e-mail | já existe |
| 7 | Senha | senha (mín. 8 caracteres, igual ao padrão atual) | já existe |
| — | Província atual | já existe hoje, mas **fica oculta** neste formulário — é derivada da cidade escolhida (ver seção 5) | ajuste |

**Removido do fluxo original do brief:** nada. Documentos, endereço completo e demais dados continuam de fora, como pedido — o atendimento completo segue depois pelo WhatsApp.

---

## 4. Modelo de dados

### `packages/utils/src/validators.ts`

Estender `registerSchema` (usado tanto no mobile quanto na nova página web):

```ts
export const comoConheceuOptions = ['amigos_indicacao', 'redes_sociais', 'evento', 'outros'] as const
export type ComoConheceu = (typeof comoConheceuOptions)[number]

export const interesseCategoriaOptions = ['transferencia_habilitacao', 'habilitacao_zero'] as const
export type InteresseCategoria = (typeof interesseCategoriaOptions)[number]

// sub-opção depende da categoria escolhida — validada com superRefine
export const registerSchema = z.object({
  full_name: z.string().min(2, 'Nome completo obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  data_nascimento: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato DD/MM/AAAA'),
  cidade_jp: z.string().min(1, 'Cidade obrigatória'),
  provincia_jp: z.string().min(1, 'Província obrigatória'), // preenchida automaticamente pela cidade
  interesse_categoria: z.enum(interesseCategoriaOptions),
  interesse_subopcao: z.string().min(1, 'Selecione uma opção'),
  como_conheceu: z.enum(comoConheceuOptions),
})
```

> Por que categoria/sub-opção são strings livres e não IDs do catálogo real de serviços (`Servico`/`ServicoVariacao`): o catálogo hoje é uma lista plana de ~10 serviços que não bate 1:1 com as duas categorias do brief do evento (ver `tmp/service-banners/services.json`). Amarrar o formulário aos IDs reais exigiria reorganizar o catálogo antes do evento — risco desnecessário para um formulário cujo objetivo é só captar a intenção, não contratar. A UENO mapeia manualmente o interesse pro serviço real durante o atendimento pelo WhatsApp, como já faz hoje com qualquer lead.

### `packages/firebase/src/types.ts` — `Cliente`

Adicionar 4 campos opcionais ao final da interface `Cliente` (não quebra nada existente):

```ts
export interface Cliente {
  // ...campos existentes
  interesse_categoria: InteresseCategoria | null
  interesse_subopcao: string | null
  como_conheceu: ComoConheceu | null
  canal_cadastro: 'mobile_app' | 'web' | null
}
```

`canal_cadastro` não é do formulário — é preenchido automaticamente pelo cliente que chama a função (mobile manda `'mobile_app'`, a página web manda `'web'`), só para a UENO conseguir depois filtrar/medir quantos leads vieram de cada canal do evento.

### `functions/src/index.ts` — `selfRegister`

Aceitar os novos campos em `request.data` e gravá-los no doc de `clientes` junto com os campos que já grava hoje (`data_nascimento`, `provincia_jp`, `cidade_jp`). Validação de enum feita com os mesmos helpers que a função já usa (`requiredString`, etc.) — rejeitar com `invalid-argument` se `interesse_categoria` ou `como_conheceu` vierem fora dos valores aceitos ou se faltar o par obrigatório (`interesse_categoria` sem `interesse_subopcao`).

Nenhuma mudança em `firestore.rules` é necessária: `selfRegister` já usa o Admin SDK e grava direto, ignorando as regras do Firestore, do mesmo jeito que faz hoje.

---

## 5. Cidade — autocomplete sem limitar a Shizuoka

Hoje `cidade_jp`/`provincia_jp` são apenas `TextInput` livres em todo o app — não existe nenhuma base de cidades japonesas no repositório. Para atender "conforme a pessoa digita, aparecem sugestões" sem depender de uma API externa (importante: o evento pode ter wifi ruim, então uma lista local responde instantaneamente e funciona offline):

- Criar `packages/utils/src/cidades-japao.ts` com uma lista estática `{ cidade: string; provincia: string }[]` cobrindo os municípios do Japão (dataset público, ex. lista oficial de municípios por província — não depende de serviço externo nem de nova integração).
- Componente de busca: digita 2+ letras → filtra a lista em memória (sem chamada de rede) → mostra até ~8 sugestões → ao selecionar, preenche `cidade_jp` e `provincia_jp` (a província some do formulário como campo visível, é só derivada).
- Mobile: novo componente `apps/mobile/src/components/CityAutocomplete.tsx` (usa `FlatList` sobreposta ao input).
- Web: usa o `Combobox`/`Command` do padrão shadcn já usado no projeto (`@radix-ui/react-popover` já é dependência).

Isso também fecha, de quebra, uma limitação que hoje existe em todo o app (cidade sempre foi texto livre) — mas o escopo aqui é só o suficiente pro formulário do evento; não vamos trocar `cidade_jp` por autocomplete nas outras telas do app agora.

---

## 6. Mensagem de WhatsApp

Montar a string a partir dos dados do formulário e abrir `wa.me` (mesmo padrão já usado em `apps/mobile/app/(cliente)/faq/index.tsx` e `apps/mobile/app/(cliente)/(tabs)/perfil/index.tsx`), mas para o **número de suporte da UENO** (`publicConfig.support_whatsapp`, já configurado em `packages/firebase/src/queries/public-config.ts`) — não é o cliente que recebe, é a UENO.

Template:

```
Olá, visitei a UENO ASSESSORIA no evento e gostaria de receber mais informações.

Nome: {full_name}
Data de nascimento: {data_nascimento}
Cidade: {cidade_jp}, {provincia_jp}
Interesse: {rótulo da categoria} – {rótulo da sub-opção}
Conheceu a UENO através de: {rótulo de como_conheceu}
```

- Mobile: `Linking.openURL('https://wa.me/<numero>?text=<encoded>')` (fallback pro deep link `whatsapp://send` se o app estiver instalado, igual ao `faq/index.tsx`).
- Web: `window.open('https://wa.me/<numero>?text=<encoded>', '_blank')`.
- Se `support_whatsapp` não estiver configurado, mostrar erro claro em vez de abrir um link quebrado — mesma checagem que `faq/index.tsx` já faz (`if (!publicConfig?.support_whatsapp) ...`).

---

## 7. Mobile — mudanças em `(auth)/register.tsx`

- Adicionar os 3 novos campos (cidade com autocomplete, interesse com sub-opção condicional, como conheceu) entre "data de nascimento" e "e-mail/senha".
- Remover o campo visível "Província atual" (some do formulário; continua sendo gravado, só que derivado da cidade escolhida).
- Depois do `selfRegister` responder com sucesso: chamar `sendVerificationEmail` **sem `await` bloquear a navegação** (dispara e não espera) e já montar/abrir o link do WhatsApp — não redirecionar mais para a tela `verify-email.tsx` neste fluxo de evento.
  - Atenção: isso muda o comportamento do cadastro para **todo mundo** que se cadastra pelo app, não só no estande do evento — é a mesma tela. Se a UENO quiser manter o cadastro "normal" (fora do evento) bloqueando por e-mail como hoje, a alternativa é duplicar a tela (`(auth)/cadastro-evento.tsx`) em vez de editar a existente; dado o prazo, a recomendação é usar a mesma tela para os dois casos — simplicidade > diferenciação de fluxo agora.

---

## 8. Web — nova página pública em `apps/web`

Novos arquivos:
- `apps/web/src/pages/evento/CadastroEventoPage.tsx` — formulário completo, usando `Button`/`Input`/`Label`/`Card` de `@/components/ui/*` (mesmo padrão de `LoginPage.tsx`) e `react-hook-form` + `zodResolver(registerSchema)`.
- Rota pública em `apps/web/src/routes/index.tsx`, **fora** do `AppShell` (mesmo nível de `/login` e `/esqueci-senha`):
  ```ts
  { path: '/evento', element: <CadastroEventoPage /> },
  ```
- Fluxo idêntico ao mobile: `createUserWithEmailAndPassword` (client SDK, já configurado em `apps/web/src/lib/firebase.ts`) → `httpsCallable(functions, 'selfRegister')` com `canal_cadastro: 'web'` → `sendEmailVerification` disparado sem bloquear → montar link `wa.me` e abrir em nova aba.
- Tela pensada para tablet/notebook no estande: inputs grandes, botão ENVIAR sempre visível, sem menu/sidebar do admin.
- Divulgar como link direto (`https://ueno-assessoria.vercel.app/evento`) — dá pra gerar um QR code apontando pra essa URL pro visitante escanear com o próprio celular e preencher no navegador dele, sem precisar instalar nada.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Página web é 100% nova e sem histórico de testes — maior risco de bug no dia do evento | Testar em pelo menos 2 navegadores (Chrome/Safari mobile) e no tablet/notebook real que vai pro estande, com pelo menos 1 dia de folga antes do evento (ver cronograma, seção 10) |
| Wifi ruim no local do evento | Autocomplete de cidade é 100% local (sem rede). Cadastro em si depende de rede (Firebase Auth + Firestore) — não tem como funcionar 100% offline; se o local não tiver wifi confiável, levar um roteador móvel/hotspot como plano B |
| Visitante cadastra 2x "só pra ver" e polui a base de leads | Aceitável para este MVP — é mais barato limpar duplicados depois no admin do que travar o fluxo com verificação extra no estande. `enforceRateLimit` já limita 5 chamadas de `selfRegister` por usuário/IP, o suficiente para não travar gente de verdade |
| Alguém abre a página web e tenta abusar do formulário (spam de contas) | Sem proteção extra além do rate limit existente hoje. Se sobrar tempo, considerar Firebase App Check na função `selfRegister` — não é bloqueante para o evento |
| Fricção da senha manual num ambiente de balcão/evento | Já é uma decisão consciente (pedido explícito de manter e-mail+senha reais). Mitigar só com UX: botão "mostrar senha" (👁), sem exigir confirmação de senha duplicada |
| Editar `register.tsx` muda o comportamento do cadastro "normal" do app (não só evento) | Ver nota na seção 7 — é a troca proposta dado o prazo; sinalizar explicitamente ao dono do produto |

---

## 10. Plano de execução (5 dias)

- **Dia 1:** `validators.ts` (novos enums/schema), `types.ts` (campos novos em `Cliente`), `selfRegister` (aceitar e gravar os campos novos), dataset `cidades-japao.ts`.
- **Dia 2:** Mobile — atualizar `register.tsx` com os campos novos, autocomplete de cidade, verificação em segundo plano, botão WhatsApp. Testar no app.
- **Dia 3:** Web — criar `CadastroEventoPage.tsx`, rota `/evento`, mesmo fluxo. Testar em desktop e mobile browser.
- **Dia 4:** Teste ponta a ponta nos dois canais com dados reais de teste (conferir Firestore, e-mail de verificação chegando, mensagem do WhatsApp formatada certo); ajustar o número de `support_whatsapp` em produção; gerar o QR code da URL `/evento`.
- **Dia 5 (véspera):** Buffer para bugs encontrados no dia 4, teste final no dispositivo/tablet físico que vai pro estande, com a conexão de internet do local do evento se possível.

---

## 11. Critérios de aceite

- [ ] Mobile: preencher os 7 campos, tocar ENVIAR, conta aparece em `clientes` no Firestore com `status_processo: 'prospect'`, `canal_cadastro: 'mobile_app'` e os 3 campos novos preenchidos.
- [ ] Web: mesmo teste, `canal_cadastro: 'web'`, acessível por `/evento` sem estar logado.
- [ ] Nos dois canais: WhatsApp abre automaticamente com a mensagem pré-formatada, sem o visitante precisar confirmar e-mail antes.
- [ ] E-mail de verificação chega na caixa de entrada (conferir também spam) em até alguns minutos, mesmo sem o visitante ter esperado por ele.
- [ ] Autocomplete de cidade sugere corretamente cidades fora de Shizuoka (ex.: digitar "Nago" sugere Nagoya).
- [ ] Cadastro duplicado (mesmo e-mail 2x) mostra erro claro ("e-mail já cadastrado") em vez de travar o app.
- [ ] `support_whatsapp` está configurado em produção com o número certo da UENO antes do evento.

---

## 12. Fora de escopo agora

- Reorganizar o catálogo real de serviços (`Servico`/`ServicoVariacao`) para bater com as duas categorias do evento.
- Autocomplete de cidade nas demais telas do app (perfil, endereço, admin) — só no formulário do evento por enquanto.
- Qualquer proteção anti-bot além do rate limit já existente.
- Dashboard/relatório de leads captados no evento (dá pra consultar direto na lista de Clientes do admin, filtrando por data de cadastro, já que o filtro existe hoje).
- Diferenciar o cadastro "de evento" do cadastro "normal" do app em telas separadas (decisão: usar a mesma tela, ver seção 7).
