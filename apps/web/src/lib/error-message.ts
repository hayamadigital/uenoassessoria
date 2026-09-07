const messages: Record<string, string> = {
  'resource-exhausted': 'Muitas solicitações. Aguarde um minuto e tente novamente.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  unauthenticated: 'Sua sessão expirou. Entre novamente.',
  unavailable: 'Serviço temporariamente indisponível. Tente novamente.',
  'deadline-exceeded': 'A solicitação demorou demais. Tente novamente.',
  'invalid-argument': 'Confira os dados informados e tente novamente.',
  'already-exists': 'Este registro já existe.',
  'email-already-in-use': 'Não foi possível usar este e-mail.',
  'requires-recent-login': 'Entre novamente antes de alterar sua senha.',
  'wrong-password': 'Não foi possível confirmar suas credenciais.',
  'invalid-credential': 'Não foi possível confirmar suas credenciais.',
  'weak-password': 'Escolha uma senha mais forte.',
  'too-many-requests': 'Muitas tentativas. Aguarde antes de tentar novamente.',
}

export function safeErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação. Tente novamente.'): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  return typeof code === 'string' ? (messages[code.replace(/^(functions|auth|firestore)\//, '')] ?? fallback) : fallback
}
