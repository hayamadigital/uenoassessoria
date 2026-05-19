import { useParams } from 'react-router-dom'
import { AvisoFormPage } from './AvisoFormPage'

export function EditarAvisoPage() {
  const { id } = useParams<{ id?: string }>()
  return <AvisoFormPage {...(id ? { id } : {})} />
}
