import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const appPath = process.argv[2]
assert.ok(appPath?.endsWith('.app'), 'Informe o caminho do .app compilado.')
const config = JSON.parse(await readFile(resolve(appPath, 'EXConstants.bundle/app.config'), 'utf8'))
assert.equal(config.ios?.bundleIdentifier, 'com.ueno.assessoria')
assert.equal(config.scheme, 'ueno', 'O app precisa do scheme para inicializar o Expo Router.')
const privacy = await readFile(resolve(appPath, 'PrivacyInfo.xcprivacy'), 'utf8')
assert.ok(privacy.includes('NSPrivacyCollectedDataTypeEmailAddress'), 'Manifesto de coleta de dados ausente.')
console.log(`Artefato validado: ${config.name} ${config.version} (${config.ios.buildNumber}); configuração e privacidade incluídas.`)
