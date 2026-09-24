import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDateBR, isIsoDate, parseDateInput } from './date.ts'

test('parseDateInput normaliza DD/MM/AAAA para ISO', () => {
  assert.equal(parseDateInput('25/02/1981'), '1981-02-25')
  assert.equal(parseDateInput('01/01/2000'), '2000-01-01')
  assert.equal(parseDateInput('29/02/2020'), '2020-02-29') // ano bissexto
  assert.equal(parseDateInput('  25/02/1981  '), '1981-02-25') // espaços
})

test('parseDateInput aceita ISO e devolve como está', () => {
  assert.equal(parseDateInput('1981-02-25'), '1981-02-25')
  assert.equal(parseDateInput('2020-02-29'), '2020-02-29')
})

test('parseDateInput rejeita datas que não existem no calendário', () => {
  assert.equal(parseDateInput('31/02/2020'), null)
  assert.equal(parseDateInput('30/02/2020'), null)
  assert.equal(parseDateInput('29/02/2021'), null) // 2021 não é bissexto
  assert.equal(parseDateInput('32/01/2020'), null)
  assert.equal(parseDateInput('01/13/2020'), null) // mês 13
  assert.equal(parseDateInput('2020-02-31'), null)
  assert.equal(parseDateInput('2020-13-01'), null)
})

test('parseDateInput devolve null para vazio, lixo e tipo errado', () => {
  assert.equal(parseDateInput(''), null)
  assert.equal(parseDateInput('   '), null)
  assert.equal(parseDateInput('25/02/81'), null) // ano com 2 dígitos
  assert.equal(parseDateInput('1981-2-5'), null) // sem zero à esquerda
  assert.equal(parseDateInput('25-02-1981'), null) // separador trocado
  assert.equal(parseDateInput('abc'), null)
  assert.equal(parseDateInput(null), null)
  assert.equal(parseDateInput(undefined), null)
  assert.equal(parseDateInput(42), null)
  assert.equal(parseDateInput('1981-02-25T00:00:00Z'), null) // data com hora não é data pura
})

test('formatDateBR converte ISO para exibição', () => {
  assert.equal(formatDateBR('1981-02-25'), '25/02/1981')
  assert.equal(formatDateBR(''), '')
  assert.equal(formatDateBR(null), '')
  assert.equal(formatDateBR('lixo'), '')
})

test('formatDateBR tolera valor legado já em BR (dados antes da migração)', () => {
  assert.equal(formatDateBR('25/02/1981'), '25/02/1981')
})

test('round-trip ISO → BR → ISO preserva a data', () => {
  for (const iso of ['1981-02-25', '2000-01-01', '2020-02-29', '1999-12-31']) {
    assert.equal(parseDateInput(formatDateBR(iso)), iso)
  }
})

test('isIsoDate só aceita ISO real', () => {
  assert.equal(isIsoDate('1981-02-25'), true)
  assert.equal(isIsoDate('25/02/1981'), false)
  assert.equal(isIsoDate('2020-02-31'), false)
  assert.equal(isIsoDate(''), false)
  assert.equal(isIsoDate(null), false)
})
