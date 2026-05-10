export const SUPPORTED_LANGUAGES = ['pt-BR', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: SupportedLanguage = 'pt-BR'

export const NAMESPACES = [
  'common',
  'auth',
  'clientes',
  'agendamentos',
  'documentos',
  'financeiro',
  'notificacoes',
  'configuracoes',
] as const

export type Namespace = (typeof NAMESPACES)[number]

/**
 * Shared i18next config base.
 * Each app (web/mobile) calls i18next.init({ ...sharedI18nConfig, resources })
 * and loads locale files itself.
 */
export const sharedI18nConfig = {
  defaultNS: 'common' as Namespace,
  ns: NAMESPACES,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false, // React / React Native already escape
  },
  react: {
    useSuspense: false,
  },
}
