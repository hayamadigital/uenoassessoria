import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { sharedI18nConfig } from '@ueno/i18n'

// pt-BR translations
import ptCommon from '@ueno/i18n/locales/pt-BR/common.json'
import ptAuth from '@ueno/i18n/locales/pt-BR/auth.json'
import ptClientes from '@ueno/i18n/locales/pt-BR/clientes.json'
import ptAgendamentos from '@ueno/i18n/locales/pt-BR/agendamentos.json'
import ptDocumentos from '@ueno/i18n/locales/pt-BR/documentos.json'
import ptFinanceiro from '@ueno/i18n/locales/pt-BR/financeiro.json'
import ptNotificacoes from '@ueno/i18n/locales/pt-BR/notificacoes.json'
import ptConfiguracoes from '@ueno/i18n/locales/pt-BR/configuracoes.json'

// en translations
import enCommon from '@ueno/i18n/locales/en/common.json'
import enAuth from '@ueno/i18n/locales/en/auth.json'
import enClientes from '@ueno/i18n/locales/en/clientes.json'
import enConfiguracoes from '@ueno/i18n/locales/en/configuracoes.json'

i18next.use(initReactI18next).init({
  ...sharedI18nConfig,
  resources: {
    'pt-BR': {
      common: ptCommon,
      auth: ptAuth,
      clientes: ptClientes,
      agendamentos: ptAgendamentos,
      documentos: ptDocumentos,
      financeiro: ptFinanceiro,
      notificacoes: ptNotificacoes,
      configuracoes: ptConfiguracoes,
    },
    en: {
      common: enCommon,
      auth: enAuth,
      clientes: enClientes,
      configuracoes: enConfiguracoes,
    },
  },
})

export default i18next
