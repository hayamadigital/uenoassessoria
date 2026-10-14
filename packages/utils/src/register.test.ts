import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// Resolve the extensionless local imports used by the app bundlers in Node tests.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('./') && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})
const { registerSchema } = await import('./validators.ts')
hooks.deregister()

const registration = {
  full_name: 'Cliente Teste',
  email: 'cliente@example.com',
  provincia_jp: '',
  cidade_jp: 'Hamamatsu',
  interesse_categorias: ['transferencia_habilitacao'],
  interesse_subopcoes: ['carro'],
  como_conheceu: 'evento',
}

test('cadastro aceita nascimento omitido ou em branco', () => {
  assert.equal(registerSchema.safeParse(registration).success, true)
  assert.equal(registerSchema.safeParse({ ...registration, data_nascimento: '' }).success, true)
})

test('cadastro preserva datas válidas ISO e legadas', () => {
  for (const date of ['2000-02-29', '29/02/2000']) {
    assert.equal(registerSchema.parse({ ...registration, data_nascimento: date }).data_nascimento, date)
  }
})

test('nascimento opcional continua rejeitando datas inválidas informadas', () => {
  for (const date of ['2001-02-29', '31/02/2000', 'abc']) {
    const result = registerSchema.safeParse({ ...registration, data_nascimento: date })
    assert.equal(result.success, false)
    if (!result.success) assert.deepEqual(result.error.issues[0]?.path, ['data_nascimento'])
  }
})

test('omitir nascimento não remove a validação de email nem de serviços', () => {
  assert.equal(registerSchema.safeParse({ ...registration, email: 'inválido' }).success, false)
  assert.equal(registerSchema.safeParse({ ...registration, interesse_subopcoes: ['inexistente'] }).success, false)
})
