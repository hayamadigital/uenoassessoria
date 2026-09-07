# Correções de segurança — 2026-09-07

Implementadas no código; publicação não realizada nesta alteração.

## Rate limit

Todas as funções callable exigem autenticação e consomem um contador por UID e operação em uma transação Firestore. Janela de 60 segundos iniciada na primeira chamada. Chamadas excedentes retornam `resource-exhausted` e `details.retryAfterSeconds`. Falhas de armazenamento impedem a operação. Os documentos de `_rate_limits` não são acessíveis pelas regras dos clientes e são reutilizados (um documento por usuário/operação).

| Operação | Chamadas por minuto por usuário |
| --- | ---: |
| selfRegister | 5 |
| setRoleClaim | 10 |
| createCliente | 20 |
| inviteUser | 10 |
| regenerateInviteLink | 5 |
| setUserActive | 20 |
| generateContractPdf | 5 |
| sendNotification | 30 |
| otimizarRota | 10 |
| getAssignedClientProfile | 300 |

O limite não cobre Firebase Authentication nem operações diretas no Firestore/Storage; não é proteção contra DDoS ou abuso distribuído entre contas. Cada chamada autorizada gera operações no Firestore. App Check continua condicionado à configuração existente, sem ativação forçada nesta mudança.

## Exposição de informações

- Leitura direta de `/users` limitada a administradores e ao próprio usuário.
- Instrutores consultam perfis de clientes por `getAssignedClientProfile`, que verifica o vínculo em `/clientes` no servidor. A biblioteca compartilhada usa essa função quando a leitura direta é negada.
- Contratos inexistentes e sem autorização retornam o mesmo erro. O status de assinatura só é informado após autorização.
- Apenas `/app_config/public` pode ser obtido sem autenticação; listagem e demais documentos exigem administrador. Esse documento deve conter somente informações públicas.
- Mensagens de erros remotos nas telas web são mapeadas por código, sem exibir a mensagem técnica original. Validações locais de CSV preservam detalhes úteis.
- Cabeçalhos web já estavam presentes; nenhuma alteração necessária.

## Validação e publicação

Executar `npm test --prefix functions` e `npm run build --workspace=@ueno/web`.
Os testes usam doubles do Firestore; não substituem testes das Security Rules no emulador. O ambiente atual não possui Java para iniciar o emulador.

Ordem de publicação: funções (incluindo a nova consulta de perfis), web e atualização mobile com a biblioteca compartilhada, depois regras Firestore. Versões antigas do app de instrutor deixam de conseguir ler perfis de clientes quando as novas regras entram em vigor; coordenar a atualização.

Antes da publicação das regras, validar no emulador: instrutor não lê `/users` diretamente; proprietário/admin mantêm acesso; público lê somente `app_config/public` e não lista a coleção; nenhum cliente lê ou escreve `_rate_limits`. Após publicação, validar agenda e lista de clientes vinculados com conta de instrutor.
