import type { UserRole } from '@ueno/supabase'

export type { UserRole }

// Auth session context shared between web and mobile
export interface AuthSession {
  userId: string
  email: string
  role: UserRole
  fullName: string
  avatarUrl: string | null
  preferredLang: 'pt-BR' | 'en'
}

// API response envelope
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Pagination
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Navigation deep link data (for push notification tap)
export interface NotificationDeepLink {
  notificacao_id: string
  referencia_tipo: string | null
  referencia_id: string | null
}

// Dashboard KPIs
export interface DashboardKPIs {
  clientes_ativos: number
  agendamentos_hoje: number
  documentos_pendentes: number
  receita_mes_jpy: number
  contratos_pendentes: number
  novos_clientes_mes: number
}
